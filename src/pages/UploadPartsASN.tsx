import { hotASN as l, tab, type PartASN, hotPart, type PartASL } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";
import { api } from "../utils/api";

const HotPartsASN = () => {

    const [railASN, setRailASN] = useAtom(l)
    const [railASL, setRailASL] = useAtom(hotPart)
    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const railASLMap = new Map(Object.entries(railASL))
    const railASNMap = new Map(Object.entries(railASN))

    const processAndSave = (asnMap: Map<string, PartASN[]>, partMap: Map<string, PartASL>) => {
        const updatedParts = { ...Object.fromEntries(partMap) };
        const updatedAsns: Record<string, PartASN[]> = {...Object.fromEntries(asnMap)};

        setRailASL(updatedParts);
        setRailASN(updatedAsns);
    };

    const processData = async (rawData: any[][]) => {
        try {
            const parsedData = rawData
                .filter(row => row.length >= 3)
                .map((row: any) => ({
                    scac:         row[25]?.trim(),
                    trailer:      row[26]?.trim(),
                    deck:         row[2]?.trim(),
                    part:         row[4]?.trim(),
                    duns:         row[12]?.trim(),
                    quantity:     parseFloat(row[15]),
                    status:       parseInt(row[19]),
                    sid:          row[20]?.trim(),
                    shipComment:  row[21]?.trim(),
                    countComment: row[8]?.trim(),
                    dock:         row[28]?.trim(),
                    shipDate:     row[16]?.trim(),
                    eda:          row[17]?.trim(),
                    eta:          row[18]?.trim(),
                    mode:         row[22]?.trim()
                }));
            const filtered = parsedData.filter(a => a.sid !== undefined && a.scac !== 'SCAC')
            console.log(filtered)
            await api.post('/api/upload_part_asn', filtered)
            const newMap = new Map();
            filtered.forEach((asn: PartASN) => {
                const trailer = asn.trailer
                if (!newMap.has(trailer)) {
                    newMap.set(trailer, [asn]);
                } else {
                    let arr = newMap.get(trailer)
                    arr.push(asn)
                    newMap.set(trailer, arr)
                }
            });
            processAndSave(newMap, railASLMap)
            setLoading(false)
        } catch (error) {
            console.log(error)
        }
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
                    <h3 style={{marginTop: '5%', marginBottom: '5%'}}>Input ASN Dashboard report for ASN information</h3>
                    <h5 style={{marginTop: '2%', marginBottom: '2%'}}><a href='https://gmap-followup.gm.com/#/asn-dashboard' target='_blank'>GMAP Link</a></h5>
                    <input
                        id="file-upload2"
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload2}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload2" className="btn btn-primary">
                        Upload GMAP
                    </label>
                </div>
            </>
        )
    }


    return (
        <>
            {loading ? <Circles /> : renderForm()}
            {railASNMap.size > 0 && 
                <>
                    <h4>Lowest days on hand obtained</h4>
                    <a onClick={() => setTab(prevTab => prevTab + 1)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Next
                    </a>
                </>
            }
        </>
    )
}

export default HotPartsASN