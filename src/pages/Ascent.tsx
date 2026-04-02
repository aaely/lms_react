import { tab, allTrls } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";

const localDateString = (): string => {
    const d = new Date()
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

const getShiftDateRange = (shift: string): { start: Date, end: Date } => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const d = today.getDate()

    switch (shift) {
        case '1st':
            return {
                start: new Date(y, m, d, 23, 0),
                end:   new Date(y, m, d + 1, 5, 59)  // next day
            }
        case '2nd':
            return {
                start: new Date(y, m, d, 14, 0),
                end:   new Date(y, m, d, 21, 59)
            }
        case '3rd':
            return {
                start: new Date(y, m, d, 22, 0),
                end:   new Date(y, m, d + 1, 5, 59)  // next day
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


const keywords = ['gmvm ar', 'android', 'avancez', 'universal']

const parseExcelDateEstToCst = (serial: number) => {
    const utcMs = (serial - 25569) * 86400 * 1000
    const cstMs = utcMs - (1 * 60 * 60 * 1000)

    const date = new Date(cstMs)
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    const timeStr = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`

    return { dateStr, timeStr }
}

const parseExcelDate = (serial: number) => {
    const date = new Date((serial - 25569) * 86400 * 1000)
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    const timeStr = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`

    return { dateStr, timeStr }
}

const getDock = (c: string, d: string) => {
    if (c.toLowerCase().includes('universal')) return 'U'
    if (c.toLowerCase().includes('avancez')) return 'V'
    if (c.toLowerCase().includes('android')) return 'V'
    return d
}

const getDuns = (d: string, c: string) => {
    if (d.length > 1) return d
    const match = c.match(/DUNS\s*(\d+)/)
    return match ? match[1] : ''
}

const Ascent = () => {

    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const [, setAll] = useAtom(allTrls)

    const processData = (rawData: any[][]) => {
        const parsedData = rawData
            .slice(1)
            .filter(row => row.length >= 3)
            .filter(row => keywords.some(k => String(row[6]).toLowerCase().includes(k)))
            .map((row: any) => ({
                uuid: crypto.randomUUID(),
                dateShift: `${localDateString()}-${currentShift()}`,
                hour: parseInt(parseExcelDateEstToCst(row[17]).timeStr),
                lmsAccent: row[0],
                dockCode: getDock(row[6], row[7]),
                acaType: 'EXPEDITE',
                status: 'EXPEDITE',
                routeId: (row[3]).slice(0,6),
                scac: row[21],
                trailer1: row[20],
                trailer2: '',
                firstSupplier: row[5],
                dockStopSequence: getDock(row[6], row[7]),
                planStartDate: parseExcelDateEstToCst(row[17]).dateStr,
                planStartTime: parseExcelDateEstToCst(row[17]).timeStr,
                scheduleStartDate: parseExcelDateEstToCst(row[17]).dateStr,
                adjustedStartTime: parseExcelDateEstToCst(row[17]).timeStr,
                scheduleEndDate: parseExcelDate(row[17]).dateStr,
                scheduleEndTime: parseExcelDate(row[17]).timeStr,
                gateArrivalTime: '',
                actualStartTime: '',
                actualEndTime: '',
                statusOX: '',
                loadComments: `DUNS: ${getDuns(row[4], row[5])} PART: ${parseInt(row[12])} ${row[23] === 'I' || row[23] === 'R' ? 'RT' : 'One-Way/No-Reload'}`,
                ryderComments: '',
                gmComments: '',
                lateComments: '',
                dockComments: '',
                lowestDoh: '',
                door: ''
            }));
        
        const shift = currentShift()

        const enriched = parsedData
            .filter(a => inShiftRange(a.planStartDate, a.planStartTime, shift))
            .map(a => ({
                ...a,
                dockCode: a.dockCode.length > 0 ? a.dockCode : '?',
                origin: 'Ascent'
            }))
        console.log(enriched)
        setAll(prev => [...prev, ...enriched])

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

export default Ascent