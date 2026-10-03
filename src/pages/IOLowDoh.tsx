import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { type PartASL } from '../signals/signals'
import { api } from '../utils/api'
import { BALANCE_DAYS, buildBalanceRows, dayLabel, fmtNum, getDay1Date, toDateKey } from '../utils/ioBalance'
import BalanceTable from '../components/BalanceTable'
import Circles from './Loader'

/*
 * IO page, 4th tab: parts on the P* and U* decks with 10 days on hand or less,
 * from the PartASL nodes (/api/get_io_low_doh), most urgent first — each with its
 * 21-day running balance. In Transit comes from scheduled IO trailers, the same
 * as IO Schedule's balance table.
 */

const MAX_DOH = 10

type Family = 'All' | 'P' | 'U'

const dohColor = (doh: number): string | undefined =>
    doh <= 1 ? '#dc3545' : doh <= 3 ? '#d97706' : undefined

const IOLowDoh = () => {
    const [parts, setParts]     = useState<PartASL[]>([])
    const [io, setIo]           = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState('')
    const [ioError, setIoError] = useState('')
    const [search, setSearch]   = useState('')
    const [family, setFamily]   = useState<Family>('All')
    const [onlyUnscheduled, setOnlyUnscheduled] = useState(false)

    const load = async () => {
        setLoading(true)
        setError('')
        setIoError('')
        // Both at once; the balances can still show without the inbound side
        const [asl, trailers] = await Promise.allSettled([
            api.get<PartASL[]>('/api/get_io_low_doh', { params: { max_doh: MAX_DOH } }),
            api.get<any[]>('/api/get_io'),
        ])
        if (asl.status === 'fulfilled') {
            setParts(asl.value.data)
        } else {
            const e: any = asl.reason
            setError(typeof e?.response?.data === 'string' && e.response.data ? e.response.data : 'Failed to load parts')
        }
        if (trailers.status === 'fulfilled' && Array.isArray(trailers.value.data)) {
            setIo(trailers.value.data)
        } else {
            setIo([])
            setIoError('Couldn\'t load IO trailers, so In Transit shows 0 and the balances leave out what\'s scheduled to arrive.')
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const shown = useMemo(() => {
        const f = search.trim().toLowerCase()
        return parts.filter(p =>
            (family === 'All' || p.deck.toUpperCase().startsWith(family)) &&
            (!f || [p.part, p.desc, p.supplier, p.duns, p.deck].some(v => (v ?? '').toLowerCase().includes(f))))
    }, [parts, search, family])

    const counts = useMemo(() => ({
        P: parts.filter(p => p.deck.toUpperCase().startsWith('P')).length,
        U: parts.filter(p => p.deck.toUpperCase().startsWith('U')).length,
    }), [parts])

    // Each part's balance only needs the trailers carrying it, so index them once
    // instead of scanning every trailer for every part and day.
    const balances = useMemo(() => {
        const byPart = new Map<string, any[]>()
        for (const trl of io) {
            for (const q of trl.PartQtys ?? []) {
                const list = byPart.get(q.part) ?? []
                if (!list.includes(trl)) list.push(trl)
                byPart.set(q.part, list)
            }
        }
        const day1 = getDay1Date()
        return new Map(parts.map(p => [`${p.deck}|${p.part}`, buildBalanceRows(p, p.part, byPart.get(p.part) ?? [], day1)]))
    }, [parts, io])

    // Parts some IO trailer is scheduled to bring in, on any date — the same
    // per-quantity date (falling back to the trailer's) that In Transit reads.
    // A trailer carrying the part but still unscheduled doesn't count.
    const scheduled = useMemo(() => {
        const set = new Set<string>()
        for (const trl of io) {
            for (const q of trl.PartQtys ?? []) {
                if (toDateKey(q.scheduleDate || trl.Schedule?.ScheduleDate)) set.add(q.part)
            }
        }
        return set
    }, [io])

    // Without the trailer list every part would look unscheduled; flag nothing then.
    const unscheduled = (part: string) => !ioError && !scheduled.has(part)
    const unscheduledCount = ioError ? 0 : shown.filter(p => !scheduled.has(p.part)).length
    const visible = onlyUnscheduled && !ioError ? shown.filter(p => !scheduled.has(p.part)) : shown

    // What's on screen, filters applied: each part's details plus its 21-day
    // balance table flattened into Req / In Transit / Proj Bal columns per date.
    const downloadCsv = () => {
        const day1 = getDay1Date()
        const days = Array.from({ length: BALANCE_DAYS }, (_, i) => i + 1)
        const fields = [
            'Deck', 'Part', 'Description', 'Supplier', 'DUNS', 'DOH', 'Balance', 'Bank', 'Nothing Scheduled',
            ...days.flatMap(n => {
                const label = dayLabel(day1, n)
                return [`${label} Req`, `${label} In Transit`, `${label} Proj Bal`]
            }),
        ]
        const data = visible.map(p => {
            const bal = balances.get(`${p.deck}|${p.part}`)
            return [
                p.deck, p.part, p.desc, p.supplier, p.duns, p.doh, p.cbal, p.bank,
                // Blank rather than a guess when the trailer list didn't load
                ioError ? '' : scheduled.has(p.part) ? 'No' : 'Yes',
                ...days.flatMap(n => [
                    (p as any)[`day${n}`] ?? '',
                    bal?.inbound[n - 1] ?? '',
                    bal?.balances[n - 1] ?? '',
                ]),
            ]
        })
        const url = URL.createObjectURL(new Blob([Papa.unparse({ fields, data })], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = `io_low_doh_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) return <Circles />

    const day1 = getDay1Date()

    return (
        <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Filter by part, description, supplier, DUNS, deck"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, width: 320 }}
                />
                {(['All', 'P', 'U'] as Family[]).map(f => (
                    <button
                        key={f}
                        onClick={() => setFamily(f)}
                        className={`btn ${family === f ? 'btn-info' : 'btn-outline-info'}`}
                    >
                        {f === 'All' ? `All (${parts.length})` : `${f} decks (${counts[f]})`}
                    </button>
                ))}
                <button onClick={load} className="btn btn-info">Refresh</button>
                <button onClick={downloadCsv} className="btn btn-info" disabled={visible.length === 0}>
                    Download CSV ({visible.length})
                </button>
                <span style={{ color: '#666', fontSize: 14 }}>
                    P* and U* decks at {MAX_DOH} days on hand or less, lowest first
                </span>
                <button
                    onClick={() => setOnlyUnscheduled(v => !v)}
                    disabled={!!ioError}
                    title={ioError ? 'IO trailers didn\'t load, so what\'s scheduled is unknown' : undefined}
                    className={`btn ${onlyUnscheduled ? 'btn-danger' : 'btn-outline-danger'}`}
                >
                    Nothing scheduled ({unscheduledCount})
                </button>
            </div>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {ioError && !error && <p style={{ color: '#d97706' }}>{ioError}</p>}

            {!error && visible.length === 0 && (
                <p style={{ color: '#888' }}>
                    {parts.length === 0
                        ? `No P or U deck parts are at ${MAX_DOH} days on hand or less.`
                        : shown.length > 0
                            ? 'Every part listed has something scheduled.'
                            : 'No parts match the filter.'}
                </p>
            )}

            {visible.map((p, index) => {
                const balance = balances.get(`${p.deck}|${p.part}`)
                const none = unscheduled(p.part)
                return (
                    <div key={`${p.deck}|${p.part}`} style={{
                        borderTop: '1px solid #ddd',
                        borderLeft: none ? '5px solid #dc3545' : '5px solid transparent',
                        padding: '10px 4px 2px 8px',
                        backgroundColor: none ? '#f8d7da' : index % 2 !== 0 ? '#f6f6f6' : '#fff',
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'baseline' }}>
                            <span style={{ color: '#888' }}>{index + 1}</span>
                            {none && (
                                <span style={{
                                    background: '#dc3545', color: 'white', borderRadius: 4,
                                    padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700,
                                }}>
                                    Nothing scheduled
                                </span>
                            )}
                            <span><strong>{p.deck}</strong></span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.part}</span>
                            <span>{p.desc}</span>
                            <span style={{ color: '#555' }}>{p.supplier}</span>
                            <span style={{ fontFamily: 'monospace', color: '#555' }}>DUNS {p.duns}</span>
                            <span style={{ fontWeight: 700, color: dohColor(p.doh) }}>{fmtNum(Number(p.doh.toFixed(1)))} DOH</span>
                            <span>Balance <strong>{fmtNum(p.cbal)}</strong></span>
                            <span>Bank <strong>{fmtNum(p.bank)}</strong></span>
                        </div>
                        {balance && <BalanceTable asl={p} balance={balance} day1={day1} />}
                    </div>
                )
            })}
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

export default IOLowDoh
