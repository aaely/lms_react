import { useAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { stagedTrailers, type PartRoute, type StagedTrailerEntry } from '../signals/signals';
import { api } from '../utils/api';
import * as XLSX from 'xlsx'
import { downloadLandscapeTable, type WordTableCell } from '../utils/wordTable'

// Lowest positive DoH across an entry's parts; '>5' is the on-screen fallback when
// nothing is positive. Shared by the table and the Word export so they can't drift.
const lowestPositiveDoh = (values: (number | null)[]): number | string => {
    const vals = values.filter((d): d is number => d !== null && d > 0)
    return vals.length > 0 ? Math.min(...vals) : '>5'
}

// The part driving the row: lowest adjusted DoH, with non-positive values last.
const primaryPart = (entry: StagedTrailerEntry) =>
    [...entry.parts].sort((a, b) => {
        const aVal = (!a.adjDohOnStage || a.adjDohOnStage <= 0) ? Infinity : a.adjDohOnStage
        const bVal = (!b.adjDohOnStage || b.adjDohOnStage <= 0) ? Infinity : b.adjDohOnStage
        return aVal - bVal
    })[0]

const begDoh = (adj: number | null) => adj != null ? (adj > 0 ? `${adj}` : '>4') : '—'
const newDoh = (val: number | null) => val != null ? (val > 0 ? `${val}` : '>5') : '—'

export default function RailRoughDraft() {
    const [staged] = useAtom(stagedTrailers)
    const dockCounters = new Map<string, number>()

    // 803 and 804 are one physical dock, so they share a running count
    const dockCountKey = (dock: string) =>
        dock === '803' || dock === '804' ? '803/804' : dock

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
        const key = dockCountKey(entry.dock)
        const count = (dockCounters.get(key) ?? 0) + 1
        dockCounters.set(key, count)
        return { ...entry, dockCount: count }
    })

    const [partInfoMap, setPartInfoMap] = useState<Map<string, PartRoute>>(new Map())

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/get_part_routes')
                setPartInfoMap(new Map(res.data.map((p: PartRoute) => [p.part, p])))
            } catch (error) {
                console.log(error)
            }
        })()
    },[])

    // Widths are twips and must total LANDSCAPE_CONTENT_WIDTH (14400 = 10in), since
    // the table is fixed-layout. Parts takes the slack; it is the only long value.
    const columnWidths = [400, 620, 780, 1100, 1800, 1300, 800, 5300, 1150, 1150]

    const downloadWord = async () => {
        const rows: WordTableCell[][] = sortedWithDockCount.map((entry, index) => {
            const first = primaryPart(entry)
            return [
                index + 1,
                entry.dock,
                entry.dockCount,
                entry.trailer,
                partInfoMap.get(entry.parts[0]?.part ?? '')?.supplier ?? '',
                entry.sids.join(', '),
                entry.decks.join(', '),
                first
                    ? [
                        { text: `${first.part} | ${partInfoMap.get(first.part)?.desc ?? ''} | ` },
                        { text: `qty: ${first.quantity}  `, color: '585757' },
                        { text: `beg doh: ${begDoh(first.adjDohOnStage)}  `, color: 'F72F2F' },
                        { text: `new doh: ${newDoh(first.newDoh)}`, color: '025702' },
                    ]
                    : '—',
                lowestPositiveDoh(entry.parts.map(p => p.adjDohOnStage)),
                lowestPositiveDoh(entry.parts.map(p => p.newDoh)),
            ]
        })

        await downloadLandscapeTable({
            title:    `Rail Rough Draft — ${new Date().toLocaleDateString('en-CA')}`,
            headers:  ['#', 'Dock', 'Dock Count', 'Trailer', 'Supplier', 'SIDs', 'Deck', 'Parts', 'Adj DoH on Stage', 'New DoH'],
            columnWidths,
            rows,
            fileName: `rail_rough_draft_${new Date().toISOString().slice(0, 10)}.docx`,
        })
    }

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
                            <td style={td}>{entry.sids.join(', ')}</td>
                            <td style={td}>{entry.decks.join(', ')}</td>
                            <td style={td}>
                                {(() => {
                                    const first = primaryPart(entry)
                                    if (!first) return '—'
                                    return (
                                        <div style={{ marginBottom: 4 }}>
                                            <span>{first.part} | {partInfoMap.get(first.part)?.desc} |</span>
                                            <span style={{ marginLeft: 8, color: '#585757' }}>qty: {first.quantity}</span>
                                            <span style={{ marginLeft: 8, color: '#f72f2f' }}>
                                                beg doh: {begDoh(first.adjDohOnStage)}
                                            </span>
                                            <span style={{ marginLeft: 8, color: '#025702' }}>new doh: {newDoh(first.newDoh)}</span>
                                        </div>
                                    )
                                })()}
                            </td>
                            <td style={td}>{lowestPositiveDoh(entry.parts.map(p => p.adjDohOnStage))}</td>
                            <td style={td}>{lowestPositiveDoh(entry.parts.map(p => p.newDoh))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={downloadExcel} className="btn btn-info">
                    Download Excel
                </button>
                <button onClick={downloadWord} className="btn btn-primary" disabled={sortedWithDockCount.length === 0}>
                    Download Word
                </button>
            </div>
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