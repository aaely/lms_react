import Papa from 'papaparse'
import { useState } from 'react'
import Circles from "./Loader";
import { api } from "../utils/api";

// The columns of LMS's exception comment report
type IncomingExceptionComment = {
    LoadNo: string
    EnteredDate: string
    Comment: string
    ActualArrivalTime: string
    SchedArrivalTime: string
}

// An LMSExceptionComments node as the upload saved it
type ExceptionComment = {
    loadNo: string
    enteredDate: string
    comment: string
    actualArrivalTime: string
    schedArrivalTime: string
}

// The report writes NULL for an empty time
const clean = (value: string | undefined) => {
    const v = value?.trim() ?? ''
    return v.toUpperCase() === 'NULL' ? '' : v
}

const cell: React.CSSProperties = { border: '1px solid #ccc', padding: '4px 8px', verticalAlign: 'top' }

const UploadLMSExceptionComments = () => {

    const [saved, setSaved] = useState<ExceptionComment[]>([])
    const [skipped, setSkipped] = useState(0)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLoading(true)
        setSuccess(false)
        setError('')
        const file = event.target.files?.[0]
        if (!file) { setLoading(false); return }

        // No delimiter given: Papa detects tabs or commas. A comment spanning
        // several lines must be quoted in the file, or it splits into rows.
        Papa.parse<IncomingExceptionComment>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: h => h.trim(),
            complete: async (results) => {
                try {
                    const parsed = results.data
                    if (parsed.length && !('Comment' in parsed[0] && 'LoadNo' in parsed[0])) {
                        setError('No LoadNo / Comment columns — is this the LMS exception comment report?')
                        return
                    }
                    const payload = parsed
                        .map(row => ({
                            loadNo:            clean(row.LoadNo),
                            enteredDate:       clean(row.EnteredDate),
                            // LMS marks line breaks in a comment with <br>
                            comment:           clean(row.Comment).replace(/<br\s*\/?>/gi, '\n'),
                            actualArrivalTime: clean(row.ActualArrivalTime),
                            schedArrivalTime:  clean(row.SchedArrivalTime),
                        }))
                        .filter(row => row.loadNo !== '')

                    const res = await api.post<ExceptionComment[]>('/api/upload_lms_exception_comments', payload)
                    setSaved(res.data)
                    setSkipped(parsed.length - payload.length)
                    setSuccess(true)
                } catch (e: unknown) {
                    const data = (e as { response?: { data?: unknown } })?.response?.data
                    setError(typeof data === 'string' && data ? data : 'Upload failed')
                } finally {
                    setLoading(false)
                    event.target.value = ''
                }
            }
        })
    }

    const renderForm = () => (
        <div style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', width: '90vw' }}>
            <h3 style={{ marginBottom: '2%' }}>Upload LMS Exception Comments</h3>
            <input
                id="file-upload-lms-exception-comments"
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleUpload}
                style={{ display: 'none' }}
            />
            <label htmlFor="file-upload-lms-exception-comments" className="btn btn-primary">
                Choose File
            </label>
            {success && (
                <p style={{ color: 'green', marginTop: '2%' }}>
                    Uploaded {saved.length} comment{saved.length !== 1 ? 's' : ''} successfully
                    {skipped > 0 && ` (${skipped} skipped: no load number)`}.
                </p>
            )}
            {error && <p style={{ color: 'red', marginTop: '2%' }}>{error}</p>}
            {success && saved.length > 0 && (
                <table style={{ borderCollapse: 'collapse', marginTop: '1%', fontSize: 13, width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={cell}>Load #</th>
                            <th style={cell}>Entered</th>
                            <th style={cell}>Comment</th>
                            <th style={cell}>Sched Arrival</th>
                            <th style={cell}>Actual Arrival</th>
                        </tr>
                    </thead>
                    <tbody>
                        {saved.map(c => (
                            <tr key={`${c.loadNo}|${c.enteredDate}|${c.comment}`}>
                                <td style={cell}>{c.loadNo}</td>
                                <td style={{ ...cell, whiteSpace: 'nowrap' }}>{c.enteredDate}</td>
                                <td style={{ ...cell, whiteSpace: 'pre-wrap' }}>{c.comment}</td>
                                <td style={{ ...cell, whiteSpace: 'nowrap' }}>{c.schedArrivalTime}</td>
                                <td style={{ ...cell, whiteSpace: 'nowrap' }}>{c.actualArrivalTime}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )

    return loading ? <Circles /> : renderForm()
}

export default UploadLMSExceptionComments
