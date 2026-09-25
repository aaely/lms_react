import { useAtom } from 'jotai';
import { useMemo, useState } from 'react';
import { railPart, railASN, type RailASL, stagedTrailers } from '../signals/signals';
import { normalizeRailDock } from '../utils/helpers';

const RAIL_DOCKS = ['802', '803', '806', '888'] as const;

const DAY_KEYS = [
    'day2',  'day3',  'day4',  'day5',  'day6',
    'day7',  'day8',  'day9',  'day10', 'day11',
    'day12', 'day13', 'day14', 'day15', 'day16',
    'day17', 'day18', 'day19', 'day20', 'day21',
] as const;

export default function RailSchedule() {
    const [parts, setParts] = useAtom(railPart);
    const [asns, setAsns] = useAtom(railASN);
    const [hoveredTrailer, setHoveredTrailer] = useState<string | null>(null);
    
    const sortedTrailers = useMemo(() => Object.keys(asns)
        .sort((a, b) => {
            const shipDateA = asns[a]?.[0]?.eda ?? ''
            const shipDateB = asns[b]?.[0]?.eda ?? ''
            const dateCompare = shipDateA.localeCompare(shipDateB)
            if (dateCompare !== 0) return dateCompare

            const statusA = parseFloat(asns[a]?.[0]?.status as any) ?? 0
            const statusB = parseFloat(asns[b]?.[0]?.status as any) ?? 0
            return statusB - statusA
    }), [asns])
    const [, setStaged] = useAtom(stagedTrailers)
    const stagedSet = useMemo(() => new Set(
        sortedTrailers.filter(trailer => asns[trailer]?.[0]?.isStaged ?? false)
    ), [sortedTrailers, asns]);

    // Index every ASN once instead of re-filtering the list for each part × trailer cell
    const qtyMap = useMemo(() => {
        const m = new Map<string, number>();
        for (const [trailer, entries] of Object.entries(asns)) {
            for (const asn of entries) {
                if (parseFloat(asn.status as any) === 5) continue;
                const key = `${trailer}|${asn.part}`;
                m.set(key, (m.get(key) ?? 0) + parseFloat(asn.quantity as any));
            }
        }
        return m;
    }, [asns]);

    // null shows every dock; clicking the active button clears back to that
    const [selectedDock, setSelectedDock] = useState<string | null>(null)

    // Which days any part has requirements for. This never depended on the part
    // being measured, so it's computed once per parts change rather than being
    // rescanned for every part on every day.
    const activeDays = useMemo(() => {
        const all = Object.values(parts);
        return new Set(DAY_KEYS.filter(key => all.some(p => (p[key] ?? 0) > 0)));
    }, [parts]);

    const getAdjDoh = (part: RailASL) => {
        if (part.doh > 8) return null;

        let bal = part.adjCbal ?? part.cbal;
        if (bal <= part.day1 && bal !== 0) return 0;
        bal -= part.day1;

        let doh = 0.0;

        for (const key of DAY_KEYS) {
            if (!activeDays.has(key)) continue;
            const d = part[key];

            if (bal > d) {
                bal -= d;
                doh += 1.0;
            } else {
                return d === 0 ? doh : parseFloat((doh + bal / d).toFixed(2));
            }
        }

        return null;
    };

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

    // Keyed on parts/activeDays, so typing in the filter no longer recomputes DoH
    const sortedParts = useMemo(() => Object.values(parts)
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
    }), [parts, activeDays]);

    // Trailers with at least one ASN at the selected dock
    const visibleTrailers = useMemo(() => {
        if (!selectedDock) return sortedTrailers
        return sortedTrailers.filter(trailer =>
            asns[trailer]?.some(asn => normalizeRailDock(asn.dock) === selectedDock)
        )
    }, [sortedTrailers, asns, selectedDock])

    // Parts are derived from the ASNs at that dock, so the rows match the columns
    const visibleParts = useMemo(() => {
        if (!selectedDock) return sortedParts
        const dockParts = new Set<string>()
        for (const entries of Object.values(asns)) {
            for (const asn of entries) {
                if (normalizeRailDock(asn.dock) === selectedDock) dockParts.add(asn.part)
            }
        }
        return sortedParts.filter(p => dockParts.has(p.part))
    }, [sortedParts, asns, selectedDock])

    return (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100vh', maxWidth: '100%' }}>
            <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                {RAIL_DOCKS.map(dock => {
                    const active = selectedDock === dock
                    return (
                        <button
                            key={dock}
                            onClick={() => setSelectedDock(active ? null : dock)}
                            style={{
                                padding: '6px 18px',
                                borderRadius: 4,
                                border: active ? '1px solid #90EE90' : '1px solid #333',
                                background: active ? '#0a2e0a' : '#1a1a1a',
                                color: active ? '#90EE90' : '#ccc',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: active ? 700 : 400,
                            }}
                        >
                            {dock}
                        </button>
                    )
                })}
                {selectedDock && (
                    <button
                        onClick={() => setSelectedDock(null)}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                    >
                        ✕ all docks
                    </button>
                )}
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                    <tr>
                        <th style={stickyTh(colOffsets[0], colWidths[0])}>#</th>
                        <th style={stickyTh(colOffsets[1], colWidths[1])}>Part</th>
                        <th style={{ ...stickyTh(colOffsets[2], colWidths[2]), ...compact }}>Desc</th>
                        <th style={stickyTh(colOffsets[3], colWidths[3])}>Duns</th>
                        <th style={{ ...stickyTh(colOffsets[4], colWidths[4]), ...compact }}>Supplier</th>
                        <th style={stickyTh(colOffsets[5], colWidths[5])}>Cbal</th>
                        <th style={stickyTh(colOffsets[6], colWidths[6])}>Adj Cbal</th>
                        <th style={stickyTh(colOffsets[7], colWidths[7])}>DoH</th>
                        <th style={stickyTh(colOffsets[8], colWidths[8])}>Adj DoH</th>
                        {visibleTrailers.map(trailer => {
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
                    {visibleParts.map((part, index) => (
                        <tr style={{backgroundColor: index % 2 === 0 ? '#bebdbd' : 'transparent'}} key={part.part}>
                            <td style={stickyTd(colOffsets[0], colWidths[0])}>{index + 1}</td>
                            <td style={stickyTd(colOffsets[1], colWidths[1])}>{part.part}</td>
                            <td title={part.desc} style={{ ...stickyTd(colOffsets[2], colWidths[2]), ...compact }}>{part.desc}</td>
                            <td style={stickyTd(colOffsets[3], colWidths[3])}>{part.duns}</td>
                            <td title={part.supplier} style={{ ...stickyTd(colOffsets[4], colWidths[4]), ...compact }}>{part.supplier}</td>
                            <td style={stickyTd(colOffsets[5], colWidths[5])}>{part.cbal}</td>
                            <td style={stickyTd(colOffsets[6], colWidths[6])}>
                                <input
                                    type="number"
                                    value={part.adjCbal ?? part.cbal}
                                    onChange={e => {
                                        const val = parseFloat(e.target.value)
                                        if (isNaN(val)) return
                                        setParts(prev => ({
                                            ...prev,
                                            [part.part]: {
                                                ...prev[part.part],
                                                adjCbal: val
                                            }
                                        }))
                                    }}
                                    style={{
                                        // must fit inside the 60px Adj Cbal cell, padding included
                                        width: 44,
                                        background: part.adjCbal !== undefined && part.adjCbal !== part.cbal ? '#fff3cd' : 'transparent',
                                        border: '1px solid #555',
                                        borderRadius: 3,
                                        padding: '2px 3px',
                                        color: '#020202',
                                        fontSize: '0.7rem',
                                    }}
                                />
                            </td>
                            <td style={stickyTd(colOffsets[7], colWidths[7])}>{part.doh}</td>
                            <td style={stickyTd(colOffsets[8], colWidths[8])}>{part.adjDoh}</td>
                            {visibleTrailers.map(trailer => {
                                const qty = qtyMap.get(`${trailer}|${part.part}`) ?? null;
                                const isStaged = stagedSet.has(trailer);
                                return (
                                    <td key={trailer} style={{
                                        ...td,
                                        top: 0,
                                        background: isStaged
                                            ? qty !== null ? '#0a2e0a' : '#0a1a0a'  // dark green tint when staged
                                            : qty !== null ? '#000200' : 'transparent',
                                        textAlign: 'center',
                                        fontWeight: qty !== null ? 'bold' : 'normal',
                                        color: qty !== null ? '#02fa17' : isStaged ? '#2a6a2a' : '#555',
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
    padding: '4px 8px',
    fontSize: '0.75rem',
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
    padding: '4px 8px',
    fontSize: '0.75rem',
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

// Desc and Supplier are narrowed and use `compact`; their text truncates with an
// ellipsis rather than overflowing, since the base cell style is whiteSpace: nowrap
const compact: React.CSSProperties = {
    fontSize: '0.7rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    padding: '4px 6px',
};

const colWidths = [30, 70, 130, 70, 170, 55, 70, 38, 52]; // #, Part, Desc, Duns, Supplier, Cbal, AdjCbal, DoH, AdjDoH
const colOffsets = colWidths.reduce<number[]>((acc, _w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + colWidths[i - 1]);
    return acc;
}, []);