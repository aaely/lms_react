import { useState, useEffect, useMemo } from 'react'
import { useAtom } from 'jotai'
import { api } from '../utils/api'
import { partAlerts, type PartAlert } from '../signals/signals'

const LEVEL_ORDER: Record<string, number> = {
    'Shut Down':      0,
    'Emerging Issue': 1,
    'Hot':            2,
}

const levelStyle = (level: string): React.CSSProperties => {
    switch (level) {
        case 'Shut Down':      return { background: '#5a1a1a', color: '#ff8080', border: '1px solid #f55' }
        case 'Emerging Issue': return { background: '#5a3a1a', color: '#ffb066', border: '1px solid #d97706' }
        case 'Hot':            return { background: '#5a4a1a', color: '#ffd666', border: '1px solid #ca8a04' }
        default:                return { background: '#333',    color: '#ccc',   border: '1px solid #555' }
    }
}

const PartAlerts = () => {
    const [alerts, setAlerts] = useAtom(partAlerts)
    const [loading, setLoading] = useState(true)
    const [search,  setSearch]  = useState('')

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get<PartAlert[]>('/api/get_part_alerts')
                setAlerts(res.data)
            } catch (err) {
                console.error('Failed to fetch part alerts:', err)
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    const filtered = useMemo(() => {
        const f = search.trim().toLowerCase()
        const list = f
            ? alerts.filter(a =>
                a.part.toLowerCase().includes(f) ||
                a.desc.toLowerCase().includes(f) ||
                a.supplier.toLowerCase().includes(f) ||
                a.duns.toLowerCase().includes(f) ||
                a.deck.toLowerCase().includes(f)
              )
            : alerts
        return [...list].sort((a, b) => {
            const rankDiff = (LEVEL_ORDER[a.alert_level] ?? 99) - (LEVEL_ORDER[b.alert_level] ?? 99)
            if (rankDiff !== 0) return rankDiff
            return a.hours_to_out - b.hours_to_out
        })
    }, [alerts, search])

    const counts = useMemo(() => {
        const c: Record<string, number> = { 'Shut Down': 0, 'Emerging Issue': 0, 'Hot': 0 }
        alerts.forEach(a => { c[a.alert_level] = (c[a.alert_level] ?? 0) + 1 })
        return c
    }, [alerts])

    return (
        <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
                    Part Alerts
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['Shut Down', 'Emerging Issue', 'Hot'] as const).map(level => (
                        <span
                            key={level}
                            style={{
                                ...levelStyle(level),
                                padding: '2px 10px',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                            }}
                        >
                            {level}: {counts[level] ?? 0}
                        </span>
                    ))}
                </div>
                <input
                    placeholder="Filter by part, desc, supplier, DUNS, deck…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        marginLeft: 'auto',
                        background: '#2a2a2a',
                        border: '1px solid #555',
                        borderRadius: 3,
                        color: '#fff',
                        padding: '5px 8px',
                        fontSize: '0.85rem',
                        width: 280,
                    }}
                />
            </div>

            {loading ? (
                <div style={{ color: '#888' }}>Loading alerts…</div>
            ) : filtered.length === 0 ? (
                <div style={{ color: '#888' }}>
                    {alerts.length === 0 ? 'No active alerts.' : 'No alerts match your filter.'}
                </div>
            ) : (
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                    <thead>
                        <tr>
                            {['Level', 'Part', 'Description', 'Deck', 'Supplier', 'DUNS', 'Bal', 'Hrs to Out', 'Rescue Margin', 'Next ASN', 'Next Trailer'].map(h => (
                                <th key={h} style={th}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((a, index) => (
                            <tr key={a.part} style={{ background: index % 2 === 0 ? '#1a1a1a' : '#222' }}>
                                <td style={td}>
                                    <span style={{ ...levelStyle(a.alert_level), padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {a.alert_level}
                                    </span>
                                </td>
                                <td style={{ ...td, color: '#fff', fontFamily: 'monospace' }}>{a.part}</td>
                                <td style={{ ...td, color: '#ccc' }}>{a.desc}</td>
                                <td style={{ ...td, color: '#ccc' }}>{a.deck}</td>
                                <td style={{ ...td, color: '#ccc' }}>{a.supplier}</td>
                                <td style={{ ...td, color: '#888', fontFamily: 'monospace' }}>{a.duns}</td>
                                <td style={{ ...td, color: '#ccc' }}>{a.cbal.toLocaleString()}</td>
                                <td style={{ ...td, color: a.hours_to_out <= 0 ? '#ff8080' : '#ccc' }}>{a.hours_to_out.toFixed(1)}</td>
                                <td style={{ ...td, color: a.hours_until_rescue <= 2 ? '#ffb066' : '#ccc' }}>{a.hours_until_rescue.toFixed(1)}</td>
                                <td style={{ ...td, color: '#ccc' }}>{a.next_asn_eta}</td>
                                <td style={{ ...td, color: '#ccc' }}>{a.next_trailer}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

const th: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 2,
}

const td: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #333',
    verticalAlign: 'middle',
}

export default PartAlerts
