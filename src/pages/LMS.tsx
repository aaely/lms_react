import { tab, allTrls } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";

const localDateString = (): string => {
    const d = new Date(Date.now())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const currentShift = () => {
    const t = new Date()
    const h = t.getHours()
    if (h >= 23 && h < 7) {
        return '1st'
    }
    if (h >= 7 && h < 15) {
        return '2nd'
    } 
    return '3rd'
}

const formatLmsDate = (val: any): string => {
    if (!val) return ''
    const str = String(val).trim()
    if (!str || str === '0') return ''
    
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
    
    // M/D/YYYY or MM/DD/YYYY
    if (str.includes('/')) {
        const [m, d, y] = str.split('/')
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }

    // Excel serial
    if (/^\d+(\.\d+)?$/.test(str)) {
        const date = new Date((parseFloat(str) - 25569) * 86400 * 1000)
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }

    return str
}

const getShiftDateRange = (shift: string): { start: Date, end: Date } => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const d = today.getDate()

    switch (shift) {
        case '1st':
            return {
                start: new Date(y, m, d, 23, 0),
                end:   new Date(y, m, d + 1, 5, 59)
            }
        case '2nd':
            return {
                start: new Date(y, m, d, 14, 0),
                end:   new Date(y, m, d, 21, 59)
            }
        case '3rd':
            return {
                start: new Date(y, m, d, 22, 0),
                end:   new Date(y, m, d + 1, 5, 59)
            }
        default:
            return {
                start: new Date(y, m, d, 0, 0),
                end:   new Date(y, m, d, 23, 59)
            }
    }
}

const inShiftRange = (dateStr: string, timeStr: string, shift: string): boolean => {
    const dt = new Date(`${dateStr}T${timeStr}`)
    const { start, end } = getShiftDateRange(shift)
    return dt >= start && dt <= end
}

const LMS = () => {

    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const [, setAll] = useAtom(allTrls)

    const processData = (rawData: any[][]) => {
        const parsedData = rawData
            .slice(6)
            .filter(row => row.length >= 3)
            .map((row: any) => ({
                uuid:              crypto.randomUUID(),
                dateShift:         `${localDateString()}-${currentShift()}`,
                hour:              parseInt(row[13]),
                lmsAccent:         row[23],
                dockCode:          row[0],
                acaType:           row[2],
                status:            row[3],
                routeId:           row[4],
                scac:              row[5],
                trailer1:          row[6],
                trailer2:          row[7],
                firstSupplier:     row[8],
                dockStopSequence:  row[9],
                planStartDate:     formatLmsDate(row[10]),
                planStartTime:     row[11],
                scheduleStartDate: formatLmsDate(row[12]),
                adjustedStartTime: row[13],
                scheduleEndDate:   formatLmsDate(row[16]),
                scheduleEndTime:   row[17],
                gateArrivalTime:   '',
                actualStartTime:   '',
                actualEndTime:     '',
                statusOX:          '',
                loadComments:      row[24],
                ryderComments:     '',
                gmComments:        '',
                lateComments:      '',
                dockComments:      '',
                lowestDoh:         '',
                door:              ''
            }));

        const filtered = parsedData.filter(a => !a.status.toLowerCase().includes('cancel'))
        const shift = currentShift()
        const enriched = filtered
            .filter(a => inShiftRange(a.scheduleStartDate, a.adjustedStartTime, shift))
            .map(a => ({
                ...a,
                dockCode: a.dockCode.length > 0 ? a.dockCode : '?',
                origin: 'LMS'
            }))
        console.log(enriched)
        setAll(enriched)
        setLoading(false)
    };

    const handleFileUpload2 = (event: React.ChangeEvent<HTMLInputElement>) => {
        
        setLoading(true);

        const file = event.target.files?.[0];
        if (!file) return;

        const isCSV = file.name.endsWith('.csv');

        if (isCSV) {

            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results: any) => {
                    processData(results.data);
                }
            });
        } else {
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const arrayBuffer = e.target?.result;
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rawData: any = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                processData(rawData);
            };
            reader.readAsArrayBuffer(file);
        }        
    };

    const renderForm = () => {
        return (
            <>
                <div style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', height: '50vh', width: '70vw'}}>
                    <h3 style={{marginTop: '5%', marginBottom: '5%'}}>Input Daily Dock Schedule Report for LMS Trailer Information</h3>
                    <input
                        id="file-upload2"
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload2}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload2" className="btn btn-primary">
                        Upload LMS Report
                    </label>
                </div>
            </>
        )
    }


    return (
        <>
            {loading ? <Circles /> : renderForm()}
                <>
                    <h4>Lowest days on hand obtained</h4>
                    <a onClick={() => setTab(prevTab => prevTab + 1)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Next
                    </a>
                </>
        </>
    )
}

export default LMS