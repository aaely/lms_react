import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { railASN, railPart, type RailASL, type PartInfo } from "../signals/signals";
import { api } from "../utils/api";

interface HotPart {
    part:     string
    pdt:      string
    mfu:      string
    comments: string
}

const HotPartTable = () => {
    const [parts] = useAtom(railPart)
    const [asns] = useAtom(railASN)
    const [partInfoMap, setPartInfoMap] = useState<Map<string, PartInfo>>(new Map())
    const [hotList, setHotList] = useState<HotPart[]>([])
    const [searchPart, setSearchPart] = useState('')

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/get_part_info')
                setPartInfoMap(new Map(res.data.map((p: PartInfo) => [p.number, p])))
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

    const updateHotPart = (partNumber: string, field: keyof Omit<HotPart, 'part'>, value: string) => {
        setHotList(prev => prev.map(h => h.part === partNumber ? { ...h, [field]: value } : h))
    }

    // Get ASNs for a part across all trailers
    const getAsnsForPart = (partNumber: string) => {
        return Object.entries(asns)
            .flatMap(([trailer, entries]) => {
                const matches = entries.filter(
                    asn => asn.part === partNumber && parseFloat(asn.status as any) !== 5
                )
                if (matches.length === 0) return []
                const totalQty = matches.reduce((sum, asn) => sum + parseFloat(asn.quantity as any), 0)
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
        return getAsnsForPart(partNumber)[0].count
    }

    return (
        <div style={{ padding: 16 }}>
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
                            const asl = parts[hot.part] as RailASL | undefined
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
                                    <td style={td}>{getLastCount(hot.part)}</td>
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
                                    <td style={td}>
                                        <button onClick={() => removePart(hot.part)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}>
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

const td: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid #ddd',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
}

export default HotPartTable