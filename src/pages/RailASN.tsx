import { railASN as l, tab, type RailASN, railPart, type RailASL } from "../signals/signals"
import { useAtom } from "jotai";
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";

const RailAsn = () => {

    const [railASN, setRailASN] = useAtom(l)
    const [railASL, setRailASL] = useAtom(railPart)
    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const railASLMap = new Map(Object.entries(railASL))
    const railASNMap = new Map(Object.entries(railASN))

    const processAndSave = (asnMap: Map<string, RailASN[]>, partMap: Map<string, RailASL>) => {
        const updatedParts = { ...Object.fromEntries(partMap) };
        const updatedAsns: Record<string, RailASN[]> = {};

        for (const [trailer, entries] of asnMap.entries()) {
            const status5 = entries.filter(asn => parseFloat(asn.status as any) === 5);
            const remaining = entries.filter(asn => parseFloat(asn.status as any) !== 5);

            for (const asn of status5) {
                if (updatedParts[asn.part]) {
                    updatedParts[asn.part] = {
                        ...updatedParts[asn.part],
                        adjCbal: (updatedParts[asn.part].adjCbal ?? updatedParts[asn.part].cbal) + parseFloat(asn.quantity as any)
                    };
                }
            }

            if (remaining.length > 0) {
                updatedAsns[trailer] = remaining;
            }
        }

        setRailASL(updatedParts);
        setRailASN(updatedAsns);
    };

    const processData = (rawData: any[][]) => {
        const parsedData = rawData
            .filter(row => row.length >= 3)
            .map((row: any) => ({
                scac:         row[25]?.trim(),
                trailer:      row[26]?.trim(),
                deck:         row[2]?.trim(),
                part:         row[4]?.trim(),
                duns:         row[12]?.trim(),
                supplier:     row[13]?.trim(),
                quantity:     row[15],
                status:       row[19],
                sid:          row[20]?.trim(),
                shipComment:  row[21]?.trim(),
                countComment: row[8]?.trim(),
                dock:         `${parseInt(row[28]?.trim())}`,
                shipDate:     row[16]?.trim(),
                eda:          row[17]?.trim(),
                eta:          row[18]?.trim(),
                mode:         row[22]?.trim(),
                isStaged:     false
            }));

        let filtered = parsedData.filter((a: any) => (a.deck === '1R' || a.deck === '3R' || a.deck === '6R' || a.deck === '8R'));
        filtered = filtered.filter((a: any) => (a.mode === 'J' || a.mode === 'R'))
        filtered = filtered.map((a: any) => {
            return {
                ...a,
                dock: (a.scac === 'ULSV' || a.scac === 'EVRP') && a.dock == '806' ? 'F1' : a.dock
            }
        })

        const newMap = new Map();
        filtered.forEach((asn: RailASN) => {
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

export default RailAsn