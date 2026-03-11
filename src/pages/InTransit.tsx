import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useAtom } from 'jotai';
import { useState } from 'react'
import Circles from "./Loader";
import { inTransit, tab, type InTransit } from '../signals/signals';
import { api } from '../utils/api';


const InTran = () => {

    const [loading, setLoading] = useState(false)
    const [, setTab] = useAtom(tab)
    const [t, setT] = useAtom(inTransit)

    const processData = (rawData: any[][]) => {
            const parsedData: InTransit[] = rawData
                .filter(row => row.length >= 3)
                .map((row: any) => ({
                    trailer: row[3],
                    sid: row[8],
                    part: row[9],
                    quantity: row[12],
                    duns: row[15],
                    cisco: row[28],
                    destination: row[27],
                    state: row[31],
                    supplier: row[16]?.slice(0, 20),
                }));

            let filtered: InTransit[] = parsedData.filter((a: any) => a.cisco === '18008' && a.trailer !== '' && (a.state === 'TX' || a.state === 'Texas') && a.part !== '84275188');
            let enriched = filtered.map(a => {
                return {
                    trailer: a.trailer,
                    sid: a.sid,
                    part: a.part,
                    quantity: a.quantity,
                    duns: a.duns,
                    cisco: a.cisco,
                    destination: a.destination.toLowerCase().includes('universal') ? 'UUU' : 'VAA',
                    supplier: a.supplier
                }
            })
            console.log(enriched)
            setT(enriched)
            setLoading(false)
        };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        
        setLoading(true);

        const file = event.target.files?.[0];
        if (!file) return;

        const isCSV = file.name.endsWith('.csv');

        if (isCSV) {

            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                skipFirstNLines: 1,
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

    const pushToDB = async () => {
        try {
            setLoading(true)
            await api.post('/api/upload_in_transit', t)
            setLoading(false)
            setTab(prev => prev + 1)
        } catch (error) {
            console.log(error)
        }
    }

    const renderForm = () => {
        return (
            <>
                <div style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', height: '50vh', width: '70vw'}}>
                    <h3 style={{marginTop: '5%', marginBottom: '5%'}}>Input GMAP report for Days on Hand information</h3>
                    <input
                        id="file-upload2"
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload2" className="btn btn-primary">
                        Upload InTransit
                    </label>
                </div>
            </>
        )
    }

    return (
        <>
            {loading ? <Circles /> : renderForm()}
            {t.length > 0 && 
                <>
                    <h4>In Transit Items Received</h4>
                    <a onClick={() => pushToDB()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Next
                    </a>
                </>
            }
        </>
    )
}

export default InTran