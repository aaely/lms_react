import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";
import { api } from "../utils/api";

// The columns of the transit time report this page reads
type IncomingPartTransit = {
    Cisco: string
    PartId: string
    MGO_Transit_Time: string
}

const CISCO = '18008'

// 'HHHH:MM' -> hours. 0000:00 is how the report leaves a transit blank, so it
// comes back null and the row is skipped — that part then alerts as before.
const toHours = (value: string | undefined): number | null => {
    const match = value?.trim().match(/^(\d+):(\d{2})$/)
    if (!match) return null
    const hours = Number(match[1]) + Number(match[2]) / 60
    return hours > 0 ? hours : null
}

const UploadPartTransit = () => {

    const [uploaded, setUploaded] = useState(0)
    const [skipped, setSkipped] = useState(0)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handlePartTransitUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true)
        setSuccess(false)
        setError('')
        const file = event.target.files?.[0]
        if (!file) { setLoading(false); return }

        // No delimiter given: Papa detects tabs or commas, so the report can be
        // saved either way.
        Papa.parse<IncomingPartTransit>(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const parsed = results.data
                    if (parsed.length && !('MGO_Transit_Time' in parsed[0])) {
                        setError('No MGO_Transit_Time column — is this the transit time report?')
                        return
                    }
                    // Only this plant's rows; the report covers other Cisco codes too
                    const payload = parsed
                        .filter(row => row.Cisco?.trim() === CISCO)
                        .map(row => ({
                            part:         row.PartId?.trim() ?? '',
                            transitHours: toHours(row.MGO_Transit_Time),
                        }))
                        .filter((row): row is { part: string, transitHours: number } =>
                            row.part !== '' && row.transitHours !== null)

                    await api.post('/api/upload_part_transit', payload)
                    setUploaded(payload.length)
                    setSkipped(parsed.length - payload.length)
                    setSuccess(true)
                } catch (e: any) {
                    setError(e?.response?.data || 'Upload failed')
                } finally {
                    setLoading(false)
                    event.target.value = ''
                }
            }
        })
    }

    const renderForm = () => (
        <div style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', width: '70vw' }}>
            <h3 style={{ marginBottom: '2%' }}>Upload Transit Times</h3>
            <input
                id="file-upload-part-transit"
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handlePartTransitUpload}
                style={{ display: 'none' }}
            />
            <label htmlFor="file-upload-part-transit" className="btn btn-primary">
                Choose File
            </label>
            {success && (
                <p style={{ color: 'green', marginTop: '2%' }}>
                    Uploaded {uploaded} record{uploaded !== 1 ? 's' : ''} successfully
                    {skipped > 0 && ` (${skipped} skipped: not Cisco ${CISCO} or no MGO transit time)`}
                </p>
            )}
            {error && <p style={{ color: 'red', marginTop: '2%' }}>{error}</p>}
        </div>
    )

    return loading ? <Circles /> : renderForm()
}

export default UploadPartTransit
