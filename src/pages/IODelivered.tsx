import { useState } from 'react'
import { type DeliveredTrailer } from '../signals/signals'
import { api } from '../utils/api'

const IODelivered = () => {
    const [trailers, setTrailers] = useState<DeliveredTrailer[]>([])
    const [date1, setDate1] = useState('')
    const [date2, setDate2] = useState('')

    const getTrailers = async () => {
        try {
            const toUtc = (date: string) => new Date(date).toISOString().slice(0, 10)
            console.log(toUtc(date1), toUtc(date2))
            const res = await api.post('/api/get_delivered', { date1: toUtc(date1), date2: toUtc(date2) })
            setTrailers(res.data)
        } catch (error) {
            console.log(error)
        }
    }

    const downloadCsv = () => {
        const headers = ['Trailer', 'Delivery Date', 'Destination', 'Supplier', 'Scac', 'ScheduleDate', 'ScheduleTime', 'Parts', 'Sids']
        let rows = trailers.map((trl: DeliveredTrailer) => [
                trl.trailer_id,
                new Date(trl.delivery_date).toLocaleDateString(),
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

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <input
                    type="date"
                    value={date1}
                    onChange={e => setDate1(e.target.value)}
                    style={inputStyle}
                />
                <span>to</span>
                <input
                    type="date"
                    value={date2}
                    onChange={e => setDate2(e.target.value)}
                    style={inputStyle}
                />
                <button onClick={getTrailers} className="btn btn-info">
                    Search
                </button>
                <button onClick={downloadCsv} className="btn btn-info">
                    Download
                </button>
            </div>


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
                                    <td style={td}>{new Date(trl.delivery_date).toLocaleDateString()}</td>
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

            {trailers.length === 0 && date1 && date2 && (
                <p style={{ color: '#888' }}>No delivered trailers found for the selected range.</p>
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