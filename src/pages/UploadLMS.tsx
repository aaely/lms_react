import { type IncomingLMSRecord } from "../signals/signals"
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";
import { api } from "../utils/api";

const UploadLMS = () => {

    const [records, setRecords] = useState<IncomingLMSRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleLMSUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true)
        setSuccess(false)
        setError('')
        const file = event.target.files?.[0]
        if (!file) { setLoading(false); return }

        Papa.parse<IncomingLMSRecord>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsed = results.data
                    const payload = parsed.map(row => ({
                        load_no:               row.loadNo ?? '',
                        location:              row.location ?? '',
                        dock:                  row.dock ?? '',
                        route_id:              row.routeid ?? '',
                        route_ver:             row.routever ?? '',
                        scac:                  row.scac ?? '',
                        status:                row.status ?? '',
                        trailer:               row.trailer1 ?? '',
                        trailer2:              row.trailer2 ?? '',
                        schedule_start_time:   row.ScheduleStartTime ?? '',
                        schedule_arrival_time: row.SchedArrivalTime ?? '',
                        actual_start_time:     row.ActualStartTime ?? '',
                        actual_end_time:       row.ActualEndTime ?? '',
                    }))
                    await api.post('/api/upload_lms', payload)
                    setRecords(parsed)
                    setSuccess(true)
                } catch (e: any) {
                    setError(e?.response?.data || 'Upload failed')
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    const renderForm = () => (
        <div style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', width: '70vw' }}>
            <h3 style={{ marginBottom: '2%' }}>Upload LMS Schedule</h3>
            <input
                id="file-upload-lms"
                type="file"
                accept=".csv"
                onChange={handleLMSUpload}
                style={{ display: 'none' }}
            />
            <label htmlFor="file-upload-lms" className="btn btn-primary">
                Choose CSV
            </label>
            {success && (
                <p style={{ color: 'green', marginTop: '2%' }}>
                    Uploaded {records.length} record{records.length !== 1 ? 's' : ''} successfully
                </p>
            )}
            {error && <p style={{ color: 'red', marginTop: '2%' }}>{error}</p>}
        </div>
    )

    return loading ? <Circles /> : renderForm()
}

export default UploadLMS
