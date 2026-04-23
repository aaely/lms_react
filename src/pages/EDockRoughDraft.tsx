import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { eDockStagedTrailers, type PartInfo } from '../signals/signals';
import { api } from '../utils/api';
import * as XLSX from 'xlsx'

export default function RailRoughDraft() {
    const [staged] = useAtom(eDockStagedTrailers)
    const dockCounters = new Map<string, number>()

    const sorted = Object.values(staged).sort((a, b) => {
        const dockCompare = (a.dock ?? '').localeCompare(b.dock ?? '')
        if (dockCompare !== 0) return dockCompare

        const aMin = Math.min(...a.parts.map(p => p.adjDohOnStage).filter((d): d is number => d !== null && d > 0))
        const bMin = Math.min(...b.parts.map(p => p.adjDohOnStage).filter((d): d is number => d !== null && d > 0))

        const aHasDoh = isFinite(aMin)
        const bHasDoh = isFinite(bMin)

        if (aHasDoh && bHasDoh) return aMin - bMin
        if (aHasDoh) return -1
        if (bHasDoh) return 1
        return 0
    })

    const downloadExcel = () => {
        const wb = XLSX.utils.book_new()

        const groupedByDock = sorted.reduce((acc, entry) => {
            if (!acc[entry.dock]) acc[entry.dock] = []
            acc[entry.dock].push(entry)
            return acc
        }, {} as Record<string, typeof sorted>)

        const headers = ['#', 'Trailer', 'EDA', 'ETA', 'SIDs', 'Decks', 'Parts', 'Adj DoH on Stage', 'New DoH']

        const buildRows = (entries: typeof sorted, dockLabel?: string) => {
            const rows: any[][] = []
            if (dockLabel) rows.push([`Dock ${dockLabel}`])
            rows.push(headers)
            entries.forEach((entry, index) => {
                const lowestAdj = Math.min(...entry.parts.map(p => p.adjDohOnStage ?? Infinity).filter(isFinite))
                const lowestNew = Math.min(...entry.parts.map(p => p.newDoh ?? Infinity).filter(isFinite))
                rows.push([
                    index + 1,
                    entry.trailer,
                    entry.eda,
                    entry.eta,
                    entry.sids.join(', '),
                    entry.decks.join(', '),
                    entry.parts.map(p => `${p.part} qty:${p.quantity}`).join(' | '),
                    lowestAdj === Infinity ? '' : lowestAdj,
                    lowestNew === Infinity ? '' : lowestNew,
                ])
            })
            rows.push([])
            return rows
        }

        // ── Dock 802 gets its own tab ──
        if (groupedByDock['802']) {
            const ws802 = XLSX.utils.aoa_to_sheet(buildRows(groupedByDock['802']))
            XLSX.utils.book_append_sheet(wb, ws802, 'Dock 802')
        }

        // ── All other docks go into Rail Rough Draft tab ──
        const mainRows: any[][] = []
        Object.entries(groupedByDock)
            .filter(([dock]) => dock !== '802')
            .forEach(([dock, entries]) => {
                buildRows(entries, dock).forEach(row => mainRows.push(row))
            })

        const wsMain = XLSX.utils.aoa_to_sheet(mainRows)
        XLSX.utils.book_append_sheet(wb, wsMain, 'Rail Rough Draft')

        XLSX.writeFile(wb, `rail_rough_draft_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const sortedWithDockCount = sorted.map(entry => {
        const count = (dockCounters.get(entry.dock) ?? 0) + 1
        dockCounters.set(entry.dock, count)
        return { ...entry, dockCount: count }
    })

    const [partInfoMap, setPartInfoMap] = useState<Map<string, PartInfo>>(new Map())

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/get_part_info')
                setPartInfoMap(new Map(res.data.map((p: PartInfo) => [p.number, p])))
            } catch (error) {
                console.log(error)
            }
        })()
    },[])

    return (
        <>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={th}>#</th>
                        <th style={th}>Dock</th>
                        <th style={th}>Dock Count</th>
                        <th style={th}>Trailer</th>
                        <th style={th}>Supplier</th>
                        <th style={th}>SIDs</th>
                        <th style={th}>EDA</th>
                        <th style={th}>ETA</th>
                        <th style={th}>Deck</th>
                        <th style={th}>Parts</th>
                        <th style={th}>Adj DoH on Stage</th>
                        <th style={th}>New DoH</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedWithDockCount.map((entry, index) => (
                        <tr key={entry.trailer}>
                            <td style={td}>{index + 1}</td>
                            <td style={td}>{entry.dock}</td>
                            <td style={td}>{entry.dockCount}</td>
                            <td style={td}>{entry.trailer}</td>
                            <td style={td}>{partInfoMap.get(entry.parts[0].part)?.supplier}</td>
                            <td style={td}>{entry.eda}</td>
                            <td style={td}>{entry.eta}</td>
                            <td style={td}>{entry.sids.join(', ')}</td>
                            <td style={td}>{entry.decks.join(', ')}</td>
                            <td style={td}>
                                {(() => {
                                    const all = [...entry.parts]
                                        .sort((a, b) => {
                                            const aVal = (!a.adjDohOnStage || a.adjDohOnStage <= 0) ? Infinity : a.adjDohOnStage
                                            const bVal = (!b.adjDohOnStage || b.adjDohOnStage <= 0) ? Infinity : b.adjDohOnStage
                                            return aVal - bVal
                                        })
                                    const first = all[0]
                                    if (!first) return '—'
                                    return (
                                        <div style={{ marginBottom: 4 }}>
                                            <span>{first.part} | {partInfoMap.get(first.part)?.desc} |</span>
                                            <span style={{ marginLeft: 8, color: '#585757' }}>qty: {first.quantity}</span>
                                            <span style={{ marginLeft: 8, color: '#f72f2f' }}>
                                                beg doh: {first.adjDohOnStage != null ? (first.adjDohOnStage > 0 ? first.adjDohOnStage : '>4') : '—'}
                                            </span>
                                            <span style={{ marginLeft: 8, color: '#025702' }}>new doh: {first.newDoh != null ? (first.newDoh > 0 ? first.newDoh : '>5') : '—'}</span>
                                        </div>
                                    )
                                })()}
                            </td>
                            <td style={td}>
                                {(() => {
                                    const vals = entry.parts
                                        .map(p => p.adjDohOnStage)
                                        .filter((d): d is number => d !== null && d > 0)
                                    return vals.length > 0 ? Math.min(...vals) : '>5'
                                })()}
                            </td>
                            <td style={td}>
                                {(() => {
                                    const vals = entry.parts
                                        .map(p => p.newDoh)
                                        .filter((d): d is number => d !== null && d > 0)
                                    return vals.length > 0 ? Math.min(...vals) : '>5'
                                })()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button onClick={downloadExcel} className="btn btn-info" style={{ marginBottom: 12 }}>
                Download Excel
            </button>
        </>
    )
}

const th: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    textAlign: 'left',
    whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #333',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
};