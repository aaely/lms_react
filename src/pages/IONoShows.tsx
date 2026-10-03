import { useState } from 'react'
import Papa from 'papaparse'
import { api } from '../utils/api'

/*
 * IO page: search the no-show log (/api/get_no_shows), the counterpart of
 * IODelivered. A no-show is logged per trailer per date it failed to arrive; the
 * trailer itself stays in the active IO pool.
 */

interface NoShowRecord {
    trailer_id:      string
    no_show_date:    string
    Comments:        string
    Destination:     string
    OriginalDate:    string
    ScheduleDate:    string
    ScheduleTime:    string
    ScheduledStatus: string
    Supplier:        string
    Scac:            string
    Location:        string
    CarrierEmail:    string
    ShipDate:        string
    parts:           string[]
    sids:            string[]
    recorded_by:     string
    recorded_at:     string
}

// no_show_date is stored as YYYY-MM-DD. new Date() would parse that as UTC midnight
// and show the previous day in local time, so format the parts directly.
const formatDay = (d: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? '')
    return m ? `${parseInt(m[2])}/${parseInt(m[3])}/${m[1]}` : (d ?? '')
}

// recorded_at is a UTC timestamp; show it in local time
const formatRecorded = (ts: string) => {
    const d = new Date(ts)
    return ts && !isNaN(d.getTime()) ? d.toLocaleString() : (ts ?? '')
}

const errorText = (e: any, fallback: string) =>
    typeof e?.response?.data === 'string' && e.response.data ? e.response.data : fallback

const IONoShows = () => {
    const [records, setRecords] = useState<NoShowRecord[]>([])
    const [date1, setDate1] = useState('')
    const [date2, setDate2] = useState('')
    const [trailerSearch, setTrailerSearch] = useState('')
    const [searched, setSearched] = useState(false)
    const [error, setError] = useState('')

    const search = async () => {
        const trailer = trailerSearch.trim()
        setError('')
        // A trailer ID searches every no-show; the date range only applies without one
        if (!trailer && (!date1 || !date2)) {
            setError('Enter a trailer ID, or pick both dates.')
            return
        }
        try {
            // Date inputs already give YYYY-MM-DD, the same format no_show_date is stored in
            const body = trailer ? { trailer_id: trailer } : { date1, date2 }
            const res = await api.post<NoShowRecord[]>('/api/get_no_shows', body)
            setRecords(res.data)
            setSearched(true)
        } catch (err) {
            console.log(err)
            setError(errorText(err, 'Search failed. Try again.'))
        }
    }

    const downloadCsv = () => {
        const csv = Papa.unparse({
            fields: ['Trailer', 'No-Show Date', 'Destination', 'Location', 'Supplier', 'Scac', 'Carrier Email',
                     'Status Before', 'Original Date', 'Schedule Date', 'Schedule Time', 'Ship Date',
                     'Sids', 'Parts', 'Comments', 'Recorded By', 'Recorded At'],
            data: records.map(r => [
                r.trailer_id, formatDay(r.no_show_date), r.Destination, r.Location, r.Supplier, r.Scac, r.CarrierEmail,
                r.ScheduledStatus, r.OriginalDate, r.ScheduleDate, r.ScheduleTime, r.ShipDate,
                r.sids.join(' | '), r.parts.join(' | '), r.Comments, r.recorded_by, formatRecorded(r.recorded_at),
            ]),
        })
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `io_no_shows_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const trailerActive = trailerSearch.trim() !== ''

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Trailer ID"
                    value={trailerSearch}
                    onChange={e => setTrailerSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') search() }}
                    style={inputStyle}
                />
                <input
                    type="date"
                    value={date1}
                    onChange={e => setDate1(e.target.value)}
                    disabled={trailerActive}
                    style={{ ...inputStyle, opacity: trailerActive ? 0.5 : 1 }}
                />
                <span style={{ opacity: trailerActive ? 0.5 : 1 }}>to</span>
                <input
                    type="date"
                    value={date2}
                    onChange={e => setDate2(e.target.value)}
                    disabled={trailerActive}
                    style={{ ...inputStyle, opacity: trailerActive ? 0.5 : 1 }}
                />
                <button onClick={search} className="btn btn-info">
                    Search
                </button>
                <button onClick={downloadCsv} className="btn btn-info" disabled={records.length === 0}>
                    Download
                </button>
                {trailerActive && (
                    <span style={{ color: '#666', fontSize: 14 }}>Searching all dates for this trailer</span>
                )}
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {records.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={th}>#</th>
                                <th style={th}>Trailer</th>
                                <th style={th}>No-Show Date</th>
                                <th style={th}>Destination</th>
                                <th style={th}>Supplier</th>
                                <th style={th}>Scac</th>
                                <th style={th}>Status Before</th>
                                <th style={th}>Schedule Date</th>
                                <th style={th}>Schedule Time</th>
                                <th style={th}>SIDs</th>
                                <th style={th}>Parts</th>
                                <th style={th}>Comments</th>
                                <th style={th}>Recorded By</th>
                                <th style={th}>Recorded At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, index) => (
                                <tr key={`${r.trailer_id}|${r.no_show_date}`} style={{ backgroundColor: index % 2 !== 0 ? '#dddada' : '#fff' }}>
                                    <td style={td}>{index + 1}</td>
                                    <td style={td}>{r.trailer_id}</td>
                                    <td style={td}>{formatDay(r.no_show_date)}</td>
                                    <td style={td}>{r.Destination}</td>
                                    <td style={td}>{r.Supplier}</td>
                                    <td style={td}>{r.Scac}</td>
                                    <td style={td}>{r.ScheduledStatus}</td>
                                    <td style={td}>{r.ScheduleDate}</td>
                                    <td style={td}>{r.ScheduleTime}</td>
                                    <td style={td}>{r.sids.join(', ')}</td>
                                    <td style={td}>{r.parts.join(', ')}</td>
                                    <td style={td}>{r.Comments}</td>
                                    <td style={td}>{r.recorded_by}</td>
                                    <td style={td}>{formatRecorded(r.recorded_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {searched && !error && records.length === 0 && (
                <p style={{ color: '#888' }}>No no-shows match that search.</p>
            )}
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid #ccc',
    fontSize: '0.9rem',
    backgroundColor: 'transparent',
    color: 'black'
}

const th: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '2px solid #333',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    background: '#fff',
    position: 'sticky',
    top: 0,
}

const td: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid #ddd',
    whiteSpace: 'nowrap',
}

export default IONoShows
