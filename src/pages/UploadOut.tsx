import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { useState } from 'react'
import { type PartOut } from '../signals/signals'
import Circles from './Loader'
import { api } from '../utils/api'

const UploadOut = () => {

    const [loading, setLoading] = useState(false)
    const [partOut, setPartOut] = useState<PartOut[]>([])

    const processPartOut = (rawData: any[][]) => {
        const parsedData= rawData
            .slice(1)
            .filter(row => row.length >= 84 && row[9])
            .map(row => ({
                part:      String(row[9]).trim(),
                day1_hr1:  parseFloat(row[35]) || 0,
                day1_hr2:  parseFloat(row[36]) || 0,
                day1_hr3:  parseFloat(row[37]) || 0,
                day1_hr4:  parseFloat(row[38]) || 0,
                day1_hr5:  parseFloat(row[39]) || 0,
                day1_hr6:  parseFloat(row[40]) || 0,
                day1_hr7:  parseFloat(row[41]) || 0,
                day1_hr8:  parseFloat(row[42]) || 0,
                day1_hr9:  parseFloat(row[43]) || 0,
                day1_hr10: parseFloat(row[44]) || 0,
                day1_hr11: parseFloat(row[45]) || 0,
                day1_hr12: parseFloat(row[46]) || 0,
                day1_hr13: parseFloat(row[47]) || 0,
                day1_hr14: parseFloat(row[48]) || 0,
                day1_hr15: parseFloat(row[49]) || 0,
                day1_hr16: parseFloat(row[50]) || 0,
                day1_hr17: parseFloat(row[51]) || 0,
                day1_hr18: parseFloat(row[52]) || 0,
                day1_hr19: parseFloat(row[53]) || 0,
                day1_hr20: parseFloat(row[54]) || 0,
                day1_hr21: parseFloat(row[55]) || 0,
                day1_hr22: parseFloat(row[56]) || 0,
                day1_hr23: parseFloat(row[57]) || 0,
                day1_hr24: parseFloat(row[58]) || 0,
                day2_hr1:  parseFloat(row[60]) || 0,
                day2_hr2:  parseFloat(row[61]) || 0,
                day2_hr3:  parseFloat(row[62]) || 0,
                day2_hr4:  parseFloat(row[63]) || 0,
                day2_hr5:  parseFloat(row[64]) || 0,
                day2_hr6:  parseFloat(row[65]) || 0,
                day2_hr7:  parseFloat(row[66]) || 0,
                day2_hr8:  parseFloat(row[67]) || 0,
                day2_hr9:  parseFloat(row[68]) || 0,
                day2_hr10: parseFloat(row[69]) || 0,
                day2_hr11: parseFloat(row[70]) || 0,
                day2_hr12: parseFloat(row[71]) || 0,
                day2_hr13: parseFloat(row[72]) || 0,
                day2_hr14: parseFloat(row[73]) || 0,
                day2_hr15: parseFloat(row[74]) || 0,
                day2_hr16: parseFloat(row[75]) || 0,
                day2_hr17: parseFloat(row[76]) || 0,
                day2_hr18: parseFloat(row[77]) || 0,
                day2_hr19: parseFloat(row[78]) || 0,
                day2_hr20: parseFloat(row[79]) || 0,
                day2_hr21: parseFloat(row[80]) || 0,
                day2_hr22: parseFloat(row[81]) || 0,
                day2_hr23: parseFloat(row[82]) || 0,
                day2_hr24: parseFloat(row[83]) || 0,
            }))
            setPartOut(parsedData)
            setLoading(false)
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
                    processPartOut(results.data);
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
                processPartOut(rawData);
            };
            reader.readAsArrayBuffer(file);
        }        
    };

    const uploadData = async () => {
        try {
            await api.post('/api/upload_part_out', partOut)
        } catch (error) {
            console.log(error)
        }
    }

    const renderForm = () => {
        return (
            <>
                <div style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', height: '50vh', width: '70vw' }}>
                    <h3 style={{ marginTop: '5%', marginBottom: '5%' }}>Upload Schedule and Requirements Report</h3>
                    <input
                        id="file-upload2"
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload2}
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload2" className="btn btn-primary">
                        Upload Report
                    </label>
                    {partOut.length > 0 && (
                        <>
                            <h4 style={{ marginTop: '5%' }}>{partOut.length} parts loaded</h4>
                            <a onClick={uploadData} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                Upload to Database
                            </a>
                        </>
                    )}
                </div>
            </>
        )
    }


    return (
        <>
            {loading ? <Circles /> : renderForm()}
                <>
                    <h4>Lowest days on hand obtained</h4>
                    <a onClick={() => uploadData()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Next
                    </a>
                </>
        </>
    )
}

export default UploadOut