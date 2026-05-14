import { lowestDoh as l, tab, isHoliday } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";


const GMAP = () => {

    const [lowestDoh, setLowestDoh] = useAtom(l)
    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const lowestDohAsMap = new Map(Object.entries(lowestDoh))
    const [h, setH] = useAtom(isHoliday)

    const handleSave = (map: Map<string, number>) => {
        const obj = Object.fromEntries(map)
        setLowestDoh(obj)
    }

    const processData = (rawData: any[][]) => {
        const parsedData = rawData
            .filter(row => row.length >= 3)
            .map((row: any) => ({
                part: row[2],
                duns: row[4],
                doh: row[11],
                desc: row[3]
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
            const doh = parseFloat(part.doh);
            if (!newMap.has(part.part) || doh < newMap.get(part.part)) {
                newMap.set(part.part, doh);
            }
        });

        handleSave(newMap);
        setLoading(false)
        setTab(prevTab => prevTab + 1)
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
                    <h5 style={{marginTop: '2%', marginBottom: '2%'}}><a href='https://gmap-followup.gm.com/#/asl-dashboard' target='_blank'>GMAP Link</a></h5>
                    <div style={{ marginBottom: '2%' }}>
                        <label style={{ marginRight: '16px' }}>
                            <input
                                type="radio"
                                name="holiday"
                                value="holiday"
                                checked={h === true}
                                onChange={() => setH(true)}
                                style={{ marginRight: '6px' }}
                            />
                            Holiday
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="holiday"
                                value="not-holiday"
                                checked={h === false}
                                onChange={() => setH(false)}
                                style={{ marginRight: '6px' }}
                            />
                            Not a Holiday
                        </label>
                    </div>
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
            {lowestDohAsMap.size > 0 && 
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