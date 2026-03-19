import { useAtom } from 'jotai';
import { useState } from 'react';
import { railPart, railASN, type RailASL, stagedTrailers } from '../signals/signals';

export default function RailSchedule() {
    const [parts, setParts] = useAtom(railPart);
    const [asns, setAsns] = useAtom(railASN);
    const [hoveredTrailer, setHoveredTrailer] = useState<string | null>(null);
    // Columns = unique trailers
    const sortedTrailers = Object.keys(asns)
        .sort((a, b) => {
            const shipDateA = asns[a]?.[0]?.eda ?? ''
            const shipDateB = asns[b]?.[0]?.eda ?? ''
            const dateCompare = shipDateA.localeCompare(shipDateB)
            if (dateCompare !== 0) return dateCompare

            const statusA = parseFloat(asns[a]?.[0]?.status as any) ?? 0
            const statusB = parseFloat(asns[b]?.[0]?.status as any) ?? 0
            return statusB - statusA
    })
    const [, setStaged] = useAtom(stagedTrailers)
    // Rows = parts from ASL
    //const partRows = Object.values(parts);

    // For a given trailer and part, sum quantity across all matching ASN entries
    const getQuantity = (trailer: string, partNumber: string): number | null => {
        const matches = asns[trailer]?.filter(
            asn => asn.part === partNumber && parseFloat(asn.status as any) !== 5
        );
        if (!matches || matches.length === 0) return null;
        return matches.reduce((sum, asn) => sum + parseFloat(asn.quantity as any), 0);
    };

    const [filter, setFilter] = useState<string>('')

    const getAdjDoh = (part: RailASL) => {
        let doh = 0.0
        let bal = 0
        if (part.doh > 4) return null
        if (part.adjCbal) {
            bal = part.adjCbal
        } else {
            bal = part.cbal
        }
        if (bal <= part.day1) return 0

        bal -= part.day1

        if (bal > part.day2) {
            bal -= part.day2
            if (part.day2 > 0) {
                doh += 1.0
            }
        } else {
            return (doh + parseFloat(bal as any / part.day2 as any)).toFixed(2)
        }
        if (bal > part.day3) {
            bal -= part.day3
            if (part.day3 > 0) {
                doh += 1.0
            }
        } else {
            return (doh + parseFloat(bal as any / part.day3 as any)).toFixed(2)
        }   
        if (bal > part.day4) {
            bal -= part.day4
            if (part.day4 > 0) {
                doh += 1.0
            }
        } else {
            return (doh + parseFloat(bal as any / part.day4 as any)).toFixed(2)
        }
        if (bal > part.day5) {
            bal -= part.day5
            if (part.day5 > 0) {
                doh += 1.0
            }
        } else {
            return (doh + parseFloat(bal as any / part.day5 as any)).toFixed(2)
        }
        
        return doh >= 4.0 ? null : doh.toFixed(2)
    }

    const toggleStaged = (trailer: string) => {
        const entries = asns[trailer];
        if (!entries) return;

        const isCurrentlyStaged = entries[0]?.isStaged ?? false;

        // ── Update isStaged on ASN entries ──
        const updatedAsns = {
            ...asns,
            [trailer]: entries.map(asn => ({ ...asn, isStaged: !isCurrentlyStaged }))
        };

        // ── Update adjCbal ──
        const updatedParts = { ...parts };
        for (const asn of entries) {
            if (updatedParts[asn.part]) {
                const qty = parseFloat(asn.quantity as any);
                const current = updatedParts[asn.part].adjCbal ?? updatedParts[asn.part].cbal;
                updatedParts[asn.part] = {
                    ...updatedParts[asn.part],
                    adjCbal: isCurrentlyStaged ? current - qty : current + qty
                };
            }
        }

        if (!isCurrentlyStaged) {

            const firstEntry = entries[0];
            setStaged(prev => ({
                ...prev,
                [trailer]: {
                    trailer,
                    dock: firstEntry?.dock ?? '',
                    eda: firstEntry?.eda ?? '',
                    eta: firstEntry?.eta ?? '',
                    shipDate: firstEntry?.shipDate ?? '',
                    sids: [...new Set(entries.map(e => e.sid))],
                    decks: [...new Set(entries.map(e => e.deck))],
                    parts: entries.map(asn => {
                        const partBefore = parts[asn.part]        
                        const partAfter = updatedParts[asn.part] 
                        return {
                            part: asn.part,
                            quantity: asn.quantity,
                            adjDohOnStage: partBefore ? Number(getAdjDoh(partBefore)) : null,
                            newDoh: partAfter ? Number(getAdjDoh(partAfter)) : null,
                        }
                    })
                }
            }))
        } else {

            setStaged(prev => {
                const updated = { ...prev }
                delete updated[trailer]
                return updated
            })
        }

        setAsns(updatedAsns);
        setParts(updatedParts);
    };

    const sortedParts = Object.values(parts)
        .map((part: RailASL) => ({ ...part, adjDoh: getAdjDoh(part) }))
        .sort((a, b) => {
            const aVal = a.adjDoh;
            const bVal = b.adjDoh;
            const aBad = aVal === null || isNaN(aVal as any);
            const bBad = bVal === null || isNaN(bVal as any);
            if (aBad && bBad) return 0;
            if (aBad) return 1;
            if (bBad) return -1;
            return parseFloat(aVal as any) - parseFloat(bVal as any);
    });

    const visibleParts = filter.trim() === ''
    ? sortedParts
    : sortedParts.filter(p =>
        p.part.toLowerCase().includes(filter.toLowerCase()) ||
        p.desc.toLowerCase().includes(filter.toLowerCase()) ||
        p.duns.toLowerCase().includes(filter.toLowerCase()) ||
        p.supplier.toLowerCase().includes(filter.toLowerCase())
    )

    return (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100vh', maxWidth: '100%' }}>
            <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <input
                    type="text"
                    placeholder="Search part or description..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    style={{
                        padding: '6px 10px',
                        borderRadius: 4,
                        border: '1px solid #333',
                        background: '#1a1a1a',
                        color: '#fff',
                        width: 260,
                        fontSize: '0.85rem',
                    }}
                />
                {filter && (
                    <button
                        onClick={() => setFilter('')}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                    >
                        ✕ clear
                    </button>
                )}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={stickyTh(colOffsets[0], colWidths[0])}>#</th>
                        <th style={stickyTh(colOffsets[1], colWidths[1])}>Part</th>
                        <th style={stickyTh(colOffsets[2], colWidths[2])}>Desc</th>
                        <th style={stickyTh(colOffsets[3], colWidths[3])}>Duns</th>
                        <th style={stickyTh(colOffsets[4], colWidths[4])}>Supplier</th>
                        <th style={stickyTh(colOffsets[5], colWidths[5])}>Cbal</th>
                        <th style={stickyTh(colOffsets[6], colWidths[6])}>Adj Cbal</th>
                        <th style={stickyTh(colOffsets[7], colWidths[7])}>DoH</th>
                        <th style={stickyTh(colOffsets[8], colWidths[8])}>Adj DoH</th>
                        <th style={stickyTh(colOffsets[9], colWidths[9])}>Day 2 Reqs</th>
                        {sortedTrailers.map(trailer => {
                            const isStaged = asns[trailer]?.[0]?.isStaged ?? false;
                            const entries = asns[trailer] ?? [];
                            return (
                                <th
                                    key={trailer}
                                    onClick={() => toggleStaged(trailer)}
                                    onMouseEnter={() => setHoveredTrailer(trailer)}
                                    onMouseLeave={() => setHoveredTrailer(null)}
                                    style={{
                                        ...th,
                                        background: isStaged ? '#0a0a0a' : '#fefeff',
                                        color: isStaged ? '#90EE90' : '#030002',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        position: 'relative',
                                    }}
                                >
                                    {trailer}
                                    <div style={{ fontSize: '0.65rem', marginTop: 2 }}>
                                        {isStaged ? '✓ staged' : 'click to stage'}
                                    </div>
                                    {hoveredTrailer === trailer && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            zIndex: 99,
                                            background: '#1a1a2e',
                                            color: '#fff',
                                            border: '1px solid #444',
                                            borderRadius: 4,
                                            padding: '8px 12px',
                                            minWidth: 200,
                                            fontSize: '0.75rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                            pointerEvents: 'none',
                                        }}>
                                            {entries.map((asn, i) => (
                                                <div key={i} style={{ marginBottom: i < entries.length - 1 ? 6 : 0 }}>
                                                    <div><strong>SID:</strong> {asn.sid}</div>
                                                    <div><strong>Stat:</strong> {asn.status}</div>
                                                    <div><strong>Scac:</strong> {asn.scac}</div>
                                                    <div><strong>Comment:</strong> {asn.shipComment}</div>
                                                    <div><strong>EDA:</strong> {asn.eda}</div>
                                                    <div><strong>ETA:</strong> {asn.eta}</div>
                                                    <div><strong>Dock:</strong> {asn.dock}</div>
                                                    {i < entries.length - 1 && <hr style={{ borderColor: '#333', margin: '4px 0' }} />}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {visibleParts.map((part: RailASL, index: number) => (
                        <tr style={{backgroundColor: index % 2 === 0 ? '#bebdbd' : 'transparent'}} key={part.part}>
                            <td style={stickyTd(colOffsets[0], colWidths[0])}>{index + 1}</td>
                            <td style={stickyTd(colOffsets[1], colWidths[1])}>{part.part}</td>
                            <td style={stickyTd(colOffsets[2], colWidths[2])}>{part.desc}</td>
                            <td onClick={() => setFilter(prev => prev.length > 0 ? '' : part.duns)} style={stickyTd(colOffsets[3], colWidths[3])}>{part.duns}</td>
                            <td style={stickyTd(colOffsets[4], colWidths[4])}>{part.supplier}</td>
                            <td style={stickyTd(colOffsets[5], colWidths[5])}>{part.cbal}</td>
                            <td style={stickyTd(colOffsets[6], colWidths[6])}>{part.adjCbal ?? part.cbal}</td>
                            <td style={stickyTd(colOffsets[7], colWidths[7])}>{part.doh}</td>
                            <td style={stickyTd(colOffsets[8], colWidths[8])}>{getAdjDoh(part)}</td>
                            <td style={stickyTd(colOffsets[9], colWidths[9])}>{part.day2}</td>
                            {sortedTrailers.map(trailer => {
                                const qty = getQuantity(trailer, part.part);
                                return (
                                    <td key={trailer} style={{
                                        ...td,
                                        top: 0,
                                        background: qty !== null ? '#000200' : 'transparent',
                                        textAlign: 'center',
                                        fontWeight: qty !== null ? 'bold' : 'normal',
                                        color: qty !== null ? '#02fa17' : '#555',
                                    }}>
                                        {qty !== null ? qty : '—'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
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
};

const td: React.CSSProperties = {
    padding: '6px 12px',
    border: '1px solid #333',
    color: '#020202',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
};

const stickyTh = (left: number, width: number): React.CSSProperties => ({
    ...th,
    position: 'sticky',
    top: 0,
    left,
    width,
    minWidth: width,
    zIndex: 3,
    boxShadow: 'inset -1px 0 0 #333',
});

const stickyTd = (left: number, width: number): React.CSSProperties => ({
    ...td,
    position: 'sticky',
    left,
    width,
    minWidth: width,
    zIndex: 1,
    background: '#faf8f8',
    boxShadow: 'inset -1px 0 0 #333',
});

const colWidths = [40, 100, 200, 100, 340, 80, 80, 50, 75, 85]; // #, Part, Cbal, AdjCbal, DoH, AdjDoH, Day2
const colOffsets = colWidths.reduce<number[]>((acc, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + colWidths[i - 1]);
    return acc;
}, []);