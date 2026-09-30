import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { useState } from 'react'
import { useAtom } from 'jotai'
import { tab, type PartOut } from '../signals/signals'
import Circles from './Loader'
import { api } from '../utils/api'

const UploadOut = () => {

    const [loading, setLoading] = useState(false)
    const [partOut, setPartOut] = useState<PartOut[]>([])
    const [uploaded, setUploaded] = useState<number | null>(null)
    const [error, setError] = useState('')
    const [, setTab] = useAtom(tab)

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
            // Rows need 84+ columns, so the wrong report parses to nothing rather
            // than failing — say so instead of silently showing no upload button.
            if (parsedData.length === 0) {
                setError('No part rows found. Check this is the Schedule and Requirements report.')
            }
            setPartOut(parsedData)
            setLoading(false)
    }

    const handleFileUpload2 = (event: React.ChangeEvent<HTMLInputElement>) => {
            
        setLoading(true);
        setUploaded(null);
        setError('');

        const file = event.target.files?.[0];
        // Cancelling the file picker lands here — without this the spinner never ends.
        if (!file) { setLoading(false); return; }

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
        // upload_part_out wipes every PartOut before inserting, so an empty list
        // would clear the table.
        if (partOut.length === 0) return
        setLoading(true)
        setError('')
        try {
            const res = await api.post('/api/upload_part_out', partOut)
            // The backend reports a failed upload as 200 with an error string, so
            // success has to be read from the body rather than the status.
            if (res.data !== 'PartOut uploaded successfully') {
                setError(typeof res.data === 'string' && res.data ? res.data : 'Upload failed')
                return
            }
            setUploaded(partOut.length)
            setPartOut([])
        } catch (error: any) {
            console.log(error)
            setError(error?.response?.data || 'Upload failed')
        } finally {
            setLoading(false)
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
                    {uploaded !== null && (
                        <>
                            <p style={{ color: 'green', marginTop: '2%' }}>
                                Uploaded {uploaded} part{uploaded !== 1 ? 's' : ''} successfully
                            </p>
                            <a onClick={() => setTab(prevTab => prevTab + 1)} className="btn btn-secondary mt-3">
                                Next
                            </a>
                        </>
                    )}
                    {error && <p style={{ color: 'red', marginTop: '2%' }}>{error}</p>}
                </div>
            </>
        )
    }


    return loading ? <Circles /> : renderForm()
}

export default UploadOut