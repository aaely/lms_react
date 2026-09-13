import { type IncomingPartRoute } from "../signals/signals"
import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";
import { api } from "../utils/api";

const UploadPartRoute = () => {

    const [records, setRecords] = useState<IncomingPartRoute[]>([])
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handlePartRouteUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true)
        setSuccess(false)
        setError('')
        const file = event.target.files?.[0]
        if (!file) { setLoading(false); return }

        Papa.parse<IncomingPartRoute>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsed = results.data
                    const payload = parsed.map(row => ({
                        part:  row.PartId ?? '',
                        duns:  row.Release_Origin_ID ?? '',
                        route: row.RouteId ?? '',
                        desc:  row.Part_Description ?? '',
                        deck:  row.MGODeckCode ?? '',
                        dock:  row.Dock,
                    }))
                    console.log(payload)
                    await api.post('/api/upload_part_route', payload)
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
            <h3 style={{ marginBottom: '2%' }}>Upload Part Routes</h3>
            <input
                id="file-upload-part-route"
                type="file"
                accept=".csv"
                onChange={handlePartRouteUpload}
                style={{ display: 'none' }}
            />
            <label htmlFor="file-upload-part-route" className="btn btn-primary">
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

export default UploadPartRoute
