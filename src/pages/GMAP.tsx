import { lowestDoh as l, tab } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";


const GMAP = () => {

    const [lowestDoh, setLowestDoh] = useAtom(l)
    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)

    const processData = (rawData: any[][]) => {
            const parsedData = rawData
                .filter(row => row.length >= 3)
                .map((row: any) => ({
                    part: row[2],
                    duns: row[4],
                    doh: row[11]
                }));
    
            let filtered = parsedData.filter((a: any) => a.doh > 0);
    
            const seenParts = new Set();
            filtered = filtered.filter((item: any) => {
                if (seenParts.has(item.part)) {
                    return false;
                }
                seenParts.add(item.part);
                return true;
            });
    
            const newMap = new Map();
            filtered.forEach((part: any) => {
                const duns = part.duns;
                const doh = parseFloat(part.doh);
                if (!newMap.has(duns) || doh < newMap.get(duns)) {
                    newMap.set(duns, doh);
                }
            });
            setLowestDoh(newMap);
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
                    <h3 style={{marginTop: '5%', marginBottom: '5%'}}>Input GMAP report for Days on Hand information</h3>
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
            {lowestDoh.size > 0 && 
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

export default GMAP