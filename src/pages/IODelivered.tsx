import { useState } from 'react'
import { type DeliveredTrailer } from '../signals/signals'
import { api } from '../utils/api'

// delivery_date is stored as YYYY-MM-DD. new Date() would parse that as UTC midnight
// and show the previous day in local time, so format the parts directly.
const formatDeliveryDate = (d: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? '')
    return m ? `${parseInt(m[2])}/${parseInt(m[3])}/${m[1]}` : (d ?? '')
}

const IODelivered = () => {
    const [trailers, setTrailers] = useState<DeliveredTrailer[]>([])
    const [date1, setDate1] = useState('')
    const [date2, setDate2] = useState('')
    const [trailerSearch, setTrailerSearch] = useState('')
    const [searched, setSearched] = useState(false)
    const [error, setError] = useState('')

    const getTrailers = async () => {
        const trailer = trailerSearch.trim()
        setError('')
        // A trailer ID searches every delivery; the date range only applies without one
        if (!trailer && (!date1 || !date2)) {
            setError('Enter a trailer ID, or pick both dates.')
            return
        }
        try {
            // Date inputs already give YYYY-MM-DD, the same format delivery_date is stored in
            const body = trailer ? { trailer_id: trailer } : { date1, date2 }
            const res = await api.post('/api/get_delivered', body)
            setTrailers(res.data)
            setSearched(true)
        } catch (err) {
            console.log(err)
            setError('Search failed. Try again.')
        }
    }

    const downloadCsv = () => {
        const headers = ['Trailer', 'Delivery Date', 'Destination', 'Supplier', 'Scac', 'ScheduleDate', 'ScheduleTime', 'Parts', 'Sids']
        let rows = trailers.map((trl: DeliveredTrailer) => [
                trl.trailer_id,
                formatDeliveryDate(trl.delivery_date),
                trl.Destination,
                trl.Supplier,
                trl.Scac,
                trl.ScheduleDate,
                trl.ScheduleTime,
                trl.parts.join(' | '),
                trl.sids.join(' | ')
        ])

        const csv = [headers, ...rows]
            .map(row => row.map((field: any) => `"${field}"`).join(','))
            .join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `io_${new Date().toISOString().slice(0, 10)}.csv`
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
                    onKeyDown={e => { if (e.key === 'Enter') getTrailers() }}
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
                <button onClick={getTrailers} className="btn btn-info">
                    Search
                </button>
                <button onClick={downloadCsv} className="btn btn-info">
                    Download
                </button>
                {trailerActive && (
                    <span style={{ color: '#666', fontSize: 14 }}>Searching all dates for this trailer</span>
                )}
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {trailers.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={th}>#</th>
                                <th style={th}>Trailer</th>
                                <th style={th}>Delivery Date</th>
                                <th style={th}>Destination</th>
                                <th style={th}>Supplier</th>
                                <th style={th}>Scac</th>
                                <th style={th}>Original Date</th>
                                <th style={th}>Schedule Date</th>
                                <th style={th}>Schedule Time</th>
                                <th style={th}>Status</th>
                                <th style={th}>SIDs</th>
                                <th style={th}>Parts</th>
                                <th style={th}>Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trailers.map((trl, index) => (
                                <tr key={index} style={{ backgroundColor: index % 2 !== 0 ? '#dddada' : '#fff' }}>
                                    <td style={td}>{index + 1}</td>
                                    <td style={td}>{trl.trailer_id}</td>
                                    <td style={td}>{formatDeliveryDate(trl.delivery_date)}</td>
                                    <td style={td}>{trl.Destination}</td>
                                    <td style={td}>{trl.Supplier}</td>
                                    <td style={td}>{trl.Scac}</td>
                                    <td style={td}>{trl.OriginalDate}</td>
                                    <td style={td}>{trl.ScheduleDate}</td>
                                    <td style={td}>{trl.ScheduleTime}</td>
                                    <td style={td}>{trl.Status}</td>
                                    <td style={td}>{trl.sids.join(', ')}</td>
                                    <td style={td}>{trl.parts.join(', ')}</td>
                                    <td style={td}>{trl.Comments}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {searched && !error && trailers.length === 0 && (
                <p style={{ color: '#888' }}>No delivered trailers match that search.</p>
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

export default IODelivered
