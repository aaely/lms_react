import { useState } from "react";
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import Circles from "./Loader";

const HourlyPDT = () => {

    const [loading, setLoading] = useState(false)

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
                    processScheduleAndRequirements(results.data);
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
                processScheduleAndRequirements(rawData);
            };
            reader.readAsArrayBuffer(file);
        }        
    };

    const processScheduleAndRequirements = (rawData: any[][]): Map<string, any> => {
        const rows = rawData.slice(1)

        const map = new Map<string, any>()

        rows
            .filter(row => row.length >= 60)
            .forEach(row => {
                const part = String(row[9]).trim()
                if (!part) return

                map.set(part, {
                    part,
                    cbal: parseFloat(String(row[23]).replace(/,/g, '')) || 0,
                    day1: {
                        hr1:  parseFloat(row[35]) || 0,
                        hr2:  parseFloat(row[36]) || 0,
                        hr3:  parseFloat(row[37]) || 0,
                        hr4:  parseFloat(row[38]) || 0,
                        hr5:  parseFloat(row[39]) || 0,
                        hr6:  parseFloat(row[40]) || 0,
                        hr7:  parseFloat(row[41]) || 0,
                        hr8:  parseFloat(row[42]) || 0,
                        hr9:  parseFloat(row[43]) || 0,
                        hr10: parseFloat(row[44]) || 0,
                        hr11: parseFloat(row[45]) || 0,
                        hr12: parseFloat(row[46]) || 0,
                        hr13: parseFloat(row[47]) || 0,
                        hr14: parseFloat(row[48]) || 0,
                        hr15: parseFloat(row[49]) || 0,
                        hr16: parseFloat(row[50]) || 0,
                        hr17: parseFloat(row[51]) || 0,
                        hr18: parseFloat(row[52]) || 0,
                        hr19: parseFloat(row[53]) || 0,
                        hr20: parseFloat(row[54]) || 0,
                        hr21: parseFloat(row[55]) || 0,
                        hr22: parseFloat(row[56]) || 0,
                        hr23: parseFloat(row[57]) || 0,
                        hr24: parseFloat(row[58]) || 0,
                    },
                    day2: {
                        hr1:  parseFloat(row[60]) || 0,
                        hr2:  parseFloat(row[61]) || 0,
                        hr3:  parseFloat(row[62]) || 0,
                        hr4:  parseFloat(row[63]) || 0,
                        hr5:  parseFloat(row[64]) || 0,
                        hr6:  parseFloat(row[65]) || 0,
                        hr7:  parseFloat(row[66]) || 0,
                        hr8:  parseFloat(row[67]) || 0,
                        hr9:  parseFloat(row[68]) || 0,
                        hr10: parseFloat(row[69]) || 0,
                        hr11: parseFloat(row[70]) || 0,
                        hr12: parseFloat(row[71]) || 0,
                        hr13: parseFloat(row[72]) || 0,
                        hr14: parseFloat(row[73]) || 0,
                        hr15: parseFloat(row[74]) || 0,
                        hr16: parseFloat(row[75]) || 0,
                        hr17: parseFloat(row[76]) || 0,
                        hr18: parseFloat(row[77]) || 0,
                        hr19: parseFloat(row[78]) || 0,
                        hr20: parseFloat(row[79]) || 0,
                        hr21: parseFloat(row[80]) || 0,
                        hr22: parseFloat(row[81]) || 0,
                        hr23: parseFloat(row[82]) || 0,
                        hr24: parseFloat(row[83]) || 0,
                    }
                })
            })

        return map
    }

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
        </>
    )
}

export default HourlyPDT