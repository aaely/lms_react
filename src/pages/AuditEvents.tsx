import { useEffect, useState } from 'react'
import { type AuditEvent } from '../signals/signals'
import { api } from '../utils/api'
import { TextField, MenuItem } from '@mui/material'

const ALL_FILTERS = ['All', 'Trailer Updates', 'Shift Roll', 'Hot Parts', 'Uploads', 'Other']

const th = { padding: '10px 12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', textAlign: 'left' } as const
const td = { padding: '6px 10px', border: '1px solid #eee', whiteSpace: 'nowrap' } as const

const AuditEvents = () => {
    const [events, setEvents]     = useState<AuditEvent[]>([])
    const [filtered, setFiltered] = useState<AuditEvent[]>([])
    const [opDate, setOpDate]     = useState<string>(new Date().toLocaleDateString('en-CA'))
    const [filter, setFilter]     = useState<string>('All')
    const [search, setSearch]     = useState<string>('')
    const [loading, setLoading]   = useState(false)

    useEffect(() => {
        if (!opDate) return
        setLoading(true)
        ;(async () => {
            try {
                const res = await api.get<AuditEvent[]>(`/api/get_audit_events/${opDate}`)
                setEvents(Array.isArray(res.data) ? res.data : [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        })()
    }, [opDate])

    useEffect(() => {
        let result = events
        if (filter !== 'All') {
            result = result.filter(e => e.event_type === filter)
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase()
            result = result.filter(e =>
                e.trailer_uuid.toLowerCase().includes(q) ||
                e.field.toLowerCase().includes(q) ||
                e.old_value.toLowerCase().includes(q) ||
                e.new_value.toLowerCase().includes(q) ||
                e.updated_by.toLowerCase().includes(q)
            )
        }
        setFiltered(result)
    }, [events, filter, search])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center', padding: '12px 20px', flexWrap: 'wrap' }}>
                <a href="/" className="btn btn-secondary mt-3">Back to Landing</a>
                <TextField
                    variant="outlined"
                    size="small"
                    label="Date"
                    type="date"
                    value={opDate}
                    onChange={e => setOpDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ width: 180 }}
                />
                <TextField
                    variant="outlined"
                    size="small"
                    label="Event Type"
                    select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    sx={{ width: 180 }}
                >
                    {ALL_FILTERS.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </TextField>
                <TextField
                    variant="outlined"
                    size="small"
                    label="Search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ width: 220 }}
                />
                <span style={{ color: '#666', fontSize: 14 }}>
                    {loading ? 'Loading…' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
                </span>
            </div>

            <h1 style={{ textAlign: 'center', marginTop: '1%' }}>Audit Events</h1>
            <h3 style={{ textAlign: 'center' }}>{opDate}</h3>

            <div style={{ padding: '20px', flex: 1, overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', height: '100%', position: 'relative' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <thead>
                            <tr style={{ position: 'sticky', top: 0, zIndex: 20, background: 'white' }}>
                                <th style={th}>#</th>
                                <th style={th}>Timestamp</th>
                                <th style={th}>Updated By</th>
                                <th style={th}>Event Type</th>
                                <th style={th}>Field</th>
                                <th style={th}>Load / Trailer</th>
                                <th style={th}>Old Value</th>
                                <th style={th}>New Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered?.map((evt, i) => {
                                return (
                                    <tr key={i}>
                                        <td style={td}>{i + 1}</td>
                                        <td style={td}>{evt.timestamp}</td>
                                        <td style={td}>{evt.updated_by}</td>
                                        <td style={{ ...td, fontWeight: 600 }}>{evt.event_type}</td>
                                        <td style={td}>{evt.field}</td>
                                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 12 }}>{evt.trailer_uuid || '—'}</td>
                                        <td style={{ ...td, color: '#c0392b' }}>{evt.old_value || '—'}</td>
                                        <td style={{ ...td, color: '#27ae60' }}>{evt.new_value || '—'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {!loading && filtered?.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>
                            No audit events for this date{filter !== 'All' ? ` / ${filter}` : ''}.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AuditEvents
