import { useEffect, useState } from "react";
import { type PartASL, type PartASN, type PartRoute } from "../signals/signals";
import { api } from "../utils/api";

interface HotPartAsn {
    trailer:  string
    quantity: number
    eda:      string
    eta:      string
    count:    string
}

interface HotPart {
    part:        string
    pdt:         string
    mfu:         string
    comments:    string
    updated_at?: string
    asn_list?:   HotPartAsn[]
    day1?:       number | null
    day2?:       number | null
    day3?:       number | null
    day4?:       number | null
    day5?:       number | null
}

const HotPartTable = () => {
    const [aslMap, setAslMap] = useState<Map<string, PartASL>>(new Map())
    const [asnMap, setAsnMap] = useState<Map<string, PartASN[]>>(new Map())
    const [partInfoMap, setPartInfoMap] = useState<Map<string, PartRoute>>(new Map())
    const [hotList, setHotList] = useState<HotPart[]>([])
    const [activeHotParts, setActiveHotParts] = useState<HotPart[]>([])
    const [searchPart, setSearchPart] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const [partInfoRes, aslRes, asnRes, hotPartsRes] = await Promise.all([
                    api.get('/api/get_part_routes'),
                    api.get('/api/get_part_asl'),
                    api.get('/api/get_part_asn'),
                    api.get('/api/get_hot_parts'),
                ])
                console.log('Part Info:', partInfoRes.data)
                setPartInfoMap(new Map(partInfoRes.data.map((p: PartRoute) => [p.part, p])))
                setAslMap(new Map(aslRes.data.map((p: PartASL) => [p.part, p])))
                const trailerMap = new Map<string, PartASN[]>()
                asnRes.data.forEach((asn: PartASN) => {
                    if (!trailerMap.has(asn.trailer)) trailerMap.set(asn.trailer, [])
                    trailerMap.get(asn.trailer)!.push(asn)
                })
                setAsnMap(trailerMap)
                setActiveHotParts(hotPartsRes.data)
            } catch (error) {
                console.log(error)
            }
        })()
    }, [])

    // Search suggestions from partInfoMap
    const suggestions = searchPart.trim().length > 0
        ? [...partInfoMap.keys()].filter(p =>
            p.toLowerCase().includes(searchPart.toLowerCase()) ||
            partInfoMap.get(p)?.desc?.toLowerCase().includes(searchPart.toLowerCase())
          ).slice(0, 10)
        : []

    const addPart = (partNumber: string) => {
        if (hotList.some(h => h.part === partNumber)) return
        setHotList(prev => [...prev, { part: partNumber, pdt: '', mfu: '', comments: '' }])
        setSearchPart('')
    }

    const removePart = (partNumber: string) => {
        setHotList(prev => prev.filter(h => h.part !== partNumber))
    }

    const submitHotPart = async (hot: HotPart) => {
        try {
            const asnList = getAsnsForPart(hot.part)
            const asl = aslMap.get(hot.part)
            const existing = activeHotParts.find(h => h.part === hot.part)
            const comments = existing?.comments && hot.comments
                ? `${existing.comments} | ${hot.comments}`
                : (hot.comments || existing?.comments || '')
            const res = await api.post('/api/create_hot_part', {
                ...hot,
                comments,
                asn_list: asnList.map(a => ({
                    trailer:  a.trailer,
                    quantity: a.quantity,
                    eda:      a.eda ?? '',
                    eta:      a.eta ?? '',
                    count:    a.count ?? '',
                })),
                day1: asl?.day1 ?? null,
                day2: asl?.day2 ?? null,
                day3: asl?.day3 ?? null,
                day4: asl?.day4 ?? null,
                day5: asl?.day5 ?? null,
            })
            const saved: HotPart = res.data
            setHotList(prev => prev.map(h => h.part === hot.part ? { ...h, updated_at: saved.updated_at } : h))
            setActiveHotParts(prev => {
                const exists = prev.some(h => h.part === saved.part)
                return exists
                    ? prev.map(h => h.part === saved.part ? saved : h)
                    : [saved, ...prev]
            })
        } catch (error) {
            console.log(error)
        }
    }

    const closeHotPart = async (partNumber: string) => {
        try {
            await api.post('/api/close_hot_part', { part: partNumber })
            setHotList(prev => prev.filter(h => h.part !== partNumber))
            setActiveHotParts(prev => prev.filter(h => h.part !== partNumber))
        } catch (error) {
            console.log(error)
        }
    }

    const updateHotPart = (partNumber: string, field: keyof Omit<HotPart, 'part'>, value: string) => {
        setHotList(prev => prev.map(h => h.part === partNumber ? { ...h, [field]: value } : h))
    }

    // Get ASNs for a part across all trailers
    const getAsnsForPart = (partNumber: string) => {
        return [...asnMap.entries()]
            .flatMap(([trailer, entries]) => {
                const matches = entries.filter((asn: PartASN) => asn.part === partNumber)
                if (matches.length === 0) return []
                const totalQty = matches.reduce((sum: number, asn: PartASN) => sum + parseFloat(asn.quantity as any), 0)
                const first = matches[0]
                return [{
                    trailer,
                    quantity: totalQty,
                    eda: first.eda,
                    eta: first.eta,
                    count: first.countComment
                }]
            })
    }

    const getLastCount = (partNumber: string) => {
        return getAsnsForPart(partNumber)[0]?.count ?? ''
    }

    return (
        <div style={{ padding: 16 }}>
            {/* ── Active Hot Parts ── */}
            {activeHotParts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 8, fontSize: '1rem' }}>Active Hot Parts</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={th}>#</th>
                                    <th style={th}>Part</th>
                                    <th style={th}>Deck</th>
                                    <th style={th}>Description</th>
                                    <th style={th}>Supplier</th>
                                    <th style={th}>Duns</th>
                                    <th style={th}>Country</th>
                                    <th style={th}>Dock</th>
                                    <th style={th}>PDT</th>
                                    <th style={th}>ASNs</th>
                                    <th style={th}>Last Count</th>
                                    <th style={th}>MFU</th>
                                    <th style={th}>CBAL</th>
                                    <th style={th}>Reqs</th>
                                    <th style={th}>Comments</th>
                                    <th style={th}>Updated At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeHotParts.map((hot, index) => {
                                    const info = partInfoMap.get(hot.part)
                                    const asl = aslMap.get(hot.part)
                                    const asnList = getAsnsForPart(hot.part)
                                    return (
                                        <tr key={hot.part} style={{ backgroundColor: index % 2 !== 0 ? '#f5f5f5' : '#fff' }}>
                                            <td style={td}>{index + 1}</td>
                                            <td style={td}>{hot.part}</td>
                                            <td style={td}>{info?.deck ?? '—'}</td>
                                            <td style={td}>{info?.desc ?? '—'}</td>
                                            <td style={td}>{info?.supplier ?? '—'}</td>
                                            <td style={td}>{info?.duns ?? '—'}</td>
                                            <td style={td}>{info?.country ?? '—'}</td>
                                            <td style={td}>{info?.dock ?? '—'}</td>
                                            <td style={td}>{hot.pdt || '—'}</td>
                                            <td style={td}>
                                                {asnList.map((asn, i) => (
                                                    <div key={i} style={{ fontSize: '0.8rem' }}>
                                                        {asn.trailer} — qty: {asn.quantity} — ETD: {asn.eda ?? '—'} / ETA: {asn.eta ?? '—'}
                                                    </div>
                                                ))}
                                            </td>
                                            <td style={td}>{getLastCount(hot.part) ?? ''}</td>
                                            <td style={td}>{hot.mfu || '—'}</td>
                                            <td style={td}>{asl?.cbal ?? '—'}</td>
                                            <td style={td}>
                                                {asl ? [asl.day1, asl.day2, asl.day3, asl.day4, asl.day5].map((val, i) => {
                                                    const date = new Date(Date.now())
                                                    date.setDate(date.getDate() + i)
                                                    const label = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
                                                    return (
                                                        <div key={i} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                            {label} =&gt; {val ?? '—'}
                                                        </div>
                                                    )
                                                }) : '—'}
                                            </td>
                                            <td style={td}>{hot.comments || '—'}</td>
                                            <td style={td}>{hot.updated_at}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Search / Add ── */}
            <div style={{ position: 'relative', marginBottom: 16, width: 300 }}>
                <input
                    type="text"
                    placeholder="Search part to add..."
                    value={searchPart}
                    onChange={e => setSearchPart(e.target.value)}
                    style={inputStyle}
                />
                {suggestions.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        background: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        zIndex: 99,
                        maxHeight: 200,
                        overflowY: 'auto',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                        {suggestions.map(p => (
                            <div
                                key={p}
                                onClick={() => addPart(p)}
                                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                            >
                                {p} — {partInfoMap.get(p)?.desc}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={th}>#</th>
                            <th style={th}>Part</th>
                            <th style={th}>Deck</th>
                            <th style={th}>Description</th>
                            <th style={th}>Supplier</th>
                            <th style={th}>Duns</th>
                            <th style={th}>Country</th>
                            <th style={th}>Dock</th>
                            <th style={th}>PDT</th>
                            <th style={th}>ASNs</th>
                            <th style={th}>Last Count</th>
                            <th style={th}>MFU</th>
                            <th style={th}>CBAL</th>
                            <th style={th}>Reqs</th>
                            <th style={th}>Comments</th>
                            <th style={th}>Updated At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hotList.map((hot, index) => {
                            const info = partInfoMap.get(hot.part)
                            const asl = aslMap.get(hot.part)
                            const asnList = getAsnsForPart(hot.part)
                            return (
                                <tr key={hot.part} style={{ backgroundColor: index % 2 !== 0 ? '#f5f5f5' : '#fff' }}>
                                    <td style={td}>{index + 1}</td>
                                    <td style={td}>{hot.part}</td>
                                    <td style={td}>{info?.deck}</td>
                                    <td style={td}>{info?.desc ?? '—'}</td>
                                    <td style={td}>{info?.supplier ?? '—'}</td>
                                    <td style={td}>{info?.duns ?? '—'}</td>
                                    <td style={td}>{info?.country ?? '—'}</td>
                                    <td style={td}>{info?.dock ?? '—'}</td>
                                    <td style={td}>
                                        <input
                                            value={hot.pdt}
                                            onChange={e => updateHotPart(hot.part, 'pdt', e.target.value)}
                                            style={{ ...inputStyle, width: 80 }}
                                        />
                                    </td>
                                    <td style={td}>
                                        {asnList.map((asn, i) => (
                                            <div key={i} style={{ fontSize: '0.8rem' }}>
                                                {asn.trailer} — qty: {asn.quantity} — ETD: {asn.eda ?? '—'} / ETA: {asn.eta ?? '—'}
                                            </div>
                                        ))}
                                    </td>
                                    <td style={td}>{getLastCount(hot.part) ?? ''}</td>
                                    <td style={td}>
                                        <input
                                            value={hot.mfu}
                                            onChange={e => updateHotPart(hot.part, 'mfu', e.target.value)}
                                            style={{ ...inputStyle, width: 80 }}
                                        />
                                    </td>
                                    <td style={td}>{asl?.cbal ?? '—'}</td>
                                    <td style={td}>
                                        {asl ? [asl.day1, asl.day2, asl.day3, asl.day4, asl.day5].map((val, i) => {
                                            const date = new Date(Date.now())
                                            date.setDate(date.getDate() + i)
                                            const label = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`
                                            return (
                                                <div key={i} style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                    {label} =&gt; {val ?? '—'}
                                                </div>
                                            )
                                        }) : '—'}
                                    </td>
                                    <td style={td}>
                                        <input
                                            value={hot.comments}
                                            onChange={e => updateHotPart(hot.part, 'comments', e.target.value)}
                                            style={{ ...inputStyle, width: 150 }}
                                        />
                                    </td>
                                    <td style={{ ...td, display: 'flex', gap: 6 }}>
                                        <button onClick={() => submitHotPart(hot)} style={actionBtn('#2196F3')}>
                                            Submit
                                        </button>
                                        <button onClick={() => closeHotPart(hot.part)} style={actionBtn('#ff9800')}>
                                            Resolve
                                        </button>
                                        <button onClick={() => removePart(hot.part)} style={actionBtn('#e53935')}>
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

const inputStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderRadius: 4,
    border: '1px solid #ccc',
    fontSize: '0.85rem',
    width: '100%',
}

const th: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '2px solid #333',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    background: '#111',
    color: '#fff',
    position: 'sticky',
    top: 0,
}

const actionBtn = (color: string): React.CSSProperties => ({
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
})

const td: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid #ddd',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
}

export default HotPartTable