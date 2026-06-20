import { hotPart as l, tab, type PartASL } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";
import { api } from "../utils/api";


const HotPartsASL = () => {

    const [hotPart, setRailPart] = useAtom(l)
    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const railASLAsMap = new Map(Object.entries(hotPart))

    const processData = async (rawData: any[][]) => {
        try {
            const partMap = new Map<string, PartASL>()

            rawData
                .filter(row => row.length >= 3 && row[16] === 'REQ' && parseFloat(row[11]) > 0)
                .forEach((row: any) => {
                    const part = row[2]
                    const doh = parseFloat(row[11])
                    const existing = partMap.get(part)

                    if (!existing || doh > 0) {
                        partMap.set(part, {
                            deck:     row[1],
                            part:     row[2],
                            duns:     row[4],
                            supplier: row[5],
                            doh:      parseFloat(row[11]),
                            bank:     parseInt(row[6]) || 0,
                            desc:     row[3],
                            cbal:     parseFloat(row[10]),
                            day1:     parseFloat(row[18]),
                            day2:     parseFloat(row[19]),
                            day3:     parseFloat(row[20]),
                            day4:     parseFloat(row[21]),
                            day5:     parseFloat(row[22]),
                            day6:     parseFloat(row[23]),
                            day7:     row[24],
                            day8:     row[25],
                            day9:     row[26],
                            day10:    row[27],
                            day11:    row[28],
                            day12:    row[29],
                            day13:    row[30],
                            day14:    row[31],
                            day15:    row[32],
                            day16:    row[33],
                            day17:    row[34],
                            day18:    row[35],
                            day19:    row[36],
                            day20:    row[37],
                            day21:    row[38],
                        })
                    }
                })
            
            await api.post('/api/upload_part_asl', Array.from(partMap.values()))

            setRailPart(Object.fromEntries(partMap))
            setLoading(false)
            } catch(error) {
                console.log(error)
            }
    }

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
                    <h3 style={{marginTop: '5%', marginBottom: '5%'}}>Input ASL Dashboard report for Days on Hand and Daily Usage Requirements</h3>
                    <h5 style={{marginTop: '2%', marginBottom: '2%'}}><a href='https://gmap-followup.gm.com/#/asl-dashboard' target='_blank'>GMAP Link</a></h5>
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
            {railASLAsMap.size > 0 && 
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

export default HotPartsASL