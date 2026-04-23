import { useAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { eDockPart, eDockASN, eDockStagedTrailers, type RailASL, type RailASN } from '../signals/signals';
import { api } from '../utils/api';

export default function EDock() {
    const [parts, setParts] = useAtom(eDockPart);
    const [asns, setAsns] = useAtom(eDockASN);
    const [hoveredTrailer, setHoveredTrailer] = useState<string | null>(null);

    const processAndSave = (asnMap: Map<string, RailASN[]>, partMap: Map<string, RailASL>) => {

        const updatedParts = { ...Object.fromEntries(partMap) };
        const updatedAsns: Record<string, RailASN[]> = {};

        for (const [trailer, entries] of asnMap.entries()) {
            if (entries.length > 0) {
                updatedAsns[trailer] = entries;
            }
        }

        setParts(updatedParts);
        setAsns(updatedAsns);
    };

    useEffect( () => {
        (async () => {
            try {
            const asl = await api.get('/api/get_edock_asl')
            const asn = await api.get('/api/get_edock_asn')
            const enriched = asl.data.map((part: RailASL) => ({
                ...part,
                adjCbal: part.cbal,
            }))
            const map = new Map()
            enriched.forEach((part: RailASL) => {
                map.set(part.part, part)
            })
            const asnMap = new Map()
            asn.data.forEach((asn: RailASN) => {
                if (!asnMap.has(asn.trailer)) {
                    asnMap.set(asn.trailer, [])
                }
                asnMap.get(asn.trailer)?.push(asn)
            })
            processAndSave(asnMap, map)
        } catch (error) {
            console.error('Error fetching eDock data:', error);
        }        
        })()
    }, []);

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
    const [, setStaged] = useAtom(eDockStagedTrailers)


    const getQuantity = (trailer: string, partNumber: string): number | null => {
        const matches = asns[trailer]?.filter(
            asn => asn.part === partNumber && parseFloat(asn.status as any) !== 5
        );
        if (!matches || matches.length === 0) return null;
        return matches.reduce((sum, asn) => sum + parseFloat(asn.quantity as any), 0);
    };

    const [filter, setFilter] = useState<string>('')
    const [filter1, setFilter1] = useState<string>('')

    const getAdjDoh = (part: RailASL) => {
        if (part.doh > 8) return null;

        let bal = part.adjCbal ?? part.cbal;

        const days = [ part.day1,
            part.day2,  part.day3,  part.day4,  part.day5,  part.day6,
            part.day7,  part.day8,  part.day9,  part.day10, part.day11,
            part.day12, part.day13, part.day14, part.day15, part.day16,
            part.day17, part.day18, part.day19, part.day20, part.day21,
        ];

        let doh = 0.0;

        for (let i = 0; i < days.length; i++) {
            const d = days[i];
            if (bal > d) {
            bal -= d;
            if (d > 0) doh += 1.0;
            } else {
            if (i === days.length - 1 && bal > d) return null;
            return d === 0 ? doh : parseFloat((doh + bal / d).toFixed(2));
            }
        }

        return null;
    };

    const toggleStaged = (trailer: string) => {
        const entries = asns[trailer];
        if (!entries) return;

        const isCurrentlyStaged = entries[0]?.isStaged ?? false;

        const updatedAsns = {
            ...asns,
            [trailer]: entries.map(asn => ({ ...asn, isStaged: !isCurrentlyStaged }))
        };

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

    const visibleTrailers = filter1.trim() === '' || !filter.match(/^\d/)
    ? sortedTrailers
    : sortedTrailers.filter(trailer =>
        asns[trailer]?.some(asn =>
            parts[asn.part]?.duns?.toLowerCase().includes(filter.toLowerCase())
        )
    )

    const updateFilter = (f: string) => {
        if (filter1.length > 0) {
            setFilter('')
            setFilter1('')
        } else {
        setFilter(f)
        setFilter1(f)
        }
    }

    return (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '100vh', maxWidth: '100%' }}>
            <a href="/edockroughdraft" className="btn btn-info mb-3">EDock</a>
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
                        onClick={() => updateFilter('')}
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
                    {visibleParts.map((part: RailASL, index: number) => (
                        <tr style={{backgroundColor: index % 2 === 0 ? '#bebdbd' : 'transparent'}} key={part.part}>
                            <td style={stickyTd(colOffsets[0], colWidths[0])}>{index + 1}</td>
                            <td style={stickyTd(colOffsets[1], colWidths[1])}>{part.part}</td>
                            <td style={stickyTd(colOffsets[2], colWidths[2])}>{part.desc}</td>
                            <td onClick={() => updateFilter(part.duns)} style={stickyTd(colOffsets[3], colWidths[3])}>{part.duns}</td>
                            <td style={stickyTd(colOffsets[4], colWidths[4])}>{part.supplier}</td>
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
                                        width: 70,
                                        background: part.adjCbal !== undefined && part.adjCbal !== part.cbal ? '#fff3cd' : 'transparent',
                                        border: '1px solid #555',
                                        borderRadius: 3,
                                        padding: '2px 4px',
                                        color: '#020202',
                                        fontSize: '0.85rem',
                                    }}
                                />
                            </td>
                            <td style={stickyTd(colOffsets[7], colWidths[7])}>{part.doh}</td>
                            <td style={stickyTd(colOffsets[8], colWidths[8])}>{getAdjDoh(part)}</td>
                            <td style={stickyTd(colOffsets[9], colWidths[9])}>{part.day2}</td>
                            {visibleTrailers.map(trailer => {
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
const colOffsets = colWidths.reduce<number[]>((acc, _w, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + colWidths[i - 1]);
    return acc;
}, []);