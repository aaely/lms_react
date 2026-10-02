import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'
import {
    BUILT_IN_DOCK_CAPACITY, SHIFTS, dockCapacity, fromRows, toRows,
    type DockCapacity as Capacity, type DockCapacityRows,
} from '../signals/dockCapacity'
import { api } from '../utils/api'
import Circles from './Loader'

/*
 * Admin editor for dock capacity (signals/dockCapacity.ts; mgo_backend
 * src/dock_capacity.rs). Edits a draft and saves the whole configuration at once.
 * Other users pick a change up the next time they load the app.
 */

// Operating-day order: 3rd shift starts at 22:00.
const HOURS = [22, 23, ...Array.from({ length: 22 }, (_, i) => i)]

type Shift = typeof SHIFTS[number]

/** Inputs hold text so a cell can be blank while it's being typed. */
interface Draft {
    shift: { dock: string; caps: Record<Shift, string> }[]
    grid:  { dock: string; caps: Record<number, string> }[]
}

const cell = (n: number | undefined) => n === undefined ? '' : String(n)

const toDraft = (c: Capacity): Draft => {
    const shiftDocks = [...new Set([...c.shift.values()].flatMap(docks => Object.keys(docks)))].sort()
    return {
        shift: shiftDocks.map(dock => ({
            dock,
            caps: Object.fromEntries(SHIFTS.map(s => [s, cell(c.shift.get(s)?.[dock])])) as Record<Shift, string>,
        })),
        grid: [...c.grid.keys()].sort().map(dock => ({
            dock,
            caps: Object.fromEntries(HOURS.map(h => [h, cell(c.grid.get(dock)?.get(h))])),
        })),
    }
}

/** Blank cells are left out: no limit per shift, no slot per hour. */
const fromDraft = (d: Draft): { rows: DockCapacityRows } | { error: string } => {
    const bad = (v: string) => v.trim() !== '' && !/^\d{1,3}$/.test(v.trim())
    for (const r of [...d.shift, ...d.grid]) {
        if (!r.dock.trim()) return { error: 'Every row needs a dock code' }
    }
    for (const [label, rows] of [['shift', d.shift], ['hourly', d.grid]] as const) {
        const docks = rows.map(r => r.dock.trim().toUpperCase())
        const dup = docks.find((dock, i) => docks.indexOf(dock) !== i)
        if (dup) return { error: `${dup} is listed twice in the ${label} table` }
    }
    for (const r of d.shift) for (const s of SHIFTS) {
        if (bad(r.caps[s])) return { error: `${r.dock} ${s}: "${r.caps[s]}" isn't a whole number 0-999` }
    }
    for (const r of d.grid) for (const h of HOURS) {
        if (bad(r.caps[h])) return { error: `${r.dock} ${h}:00: "${r.caps[h]}" isn't a whole number 0-999` }
    }
    const rows: DockCapacityRows = {
        shift: d.shift.flatMap(r => SHIFTS
            .filter(s => r.caps[s].trim() !== '')
            .map(s => ({ shift: s, dock: r.dock.trim().toUpperCase(), capacity: Number(r.caps[s]) }))),
        hourly: d.grid.flatMap(r => HOURS
            .filter(h => r.caps[h].trim() !== '')
            .map(h => ({ dock: r.dock.trim().toUpperCase(), hour: h, capacity: Number(r.caps[h]) }))),
    }
    if (rows.shift.length === 0 || rows.hourly.length === 0) {
        return { error: 'Both tables need at least one value' }
    }
    return { rows }
}

const errorText = (e: any): string =>
    typeof e?.response?.data === 'string' && e.response.data ? e.response.data : (e?.message ?? 'Save failed')

const th: React.CSSProperties = { padding: '4px 6px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', fontSize: '0.8rem' }
const td: React.CSSProperties = { padding: '2px 4px', borderBottom: '1px solid #eee' }
const num: React.CSSProperties = { width: 46, textAlign: 'center' }

const DockCapacity = () => {
    const [u] = useAtom(user)
    const [capacity, setCapacity] = useAtom(dockCapacity)
    const [draft, setDraft] = useState<Draft>(() => toDraft(capacity))
    const [dirty, setDirty] = useState(false)
    const [fill, setFill] = useState<Record<string, string>>({})
    const [newShiftDock, setNewShiftDock] = useState('')
    const [newGridDock, setNewGridDock] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    // The saved configuration can arrive after this page opens, or be pushed over
    // the websocket when another admin saves; take it unless this admin has
    // already started editing. Not while saving: our own save is broadcast back,
    // possibly before its response lands.
    useEffect(() => {
        if (saving) return
        if (!dirty) { setDraft(toDraft(capacity)); return }
        setMessage({
            ok: false,
            text: 'Someone else saved Dock Capacity while you were editing. Saving replaces their changes; Discard changes loads theirs.',
        })
    }, [capacity])  // eslint-disable-line react-hooks/exhaustive-deps

    // Leaving edit mode (discard, or a save) picks up whatever is current.
    useEffect(() => { if (!dirty) setDraft(toDraft(capacity)) }, [dirty])  // eslint-disable-line react-hooks/exhaustive-deps

    if (u.role !== 'admin') {
        return <p style={{ margin: '5%' }}>Dock capacity is admin only.</p>
    }

    const edit = (next: Draft) => { setDraft(next); setDirty(true); setMessage(null) }

    const setShiftCell = (i: number, s: Shift, v: string) =>
        edit({ ...draft, shift: draft.shift.map((r, j) => j === i ? { ...r, caps: { ...r.caps, [s]: v } } : r) })
    const setGridCell = (i: number, h: number, v: string) =>
        edit({ ...draft, grid: draft.grid.map((r, j) => j === i ? { ...r, caps: { ...r.caps, [h]: v } } : r) })
    const fillRow = (i: number) => {
        const v = fill[draft.grid[i].dock] ?? ''
        edit({ ...draft, grid: draft.grid.map((r, j) => j === i ? { ...r, caps: Object.fromEntries(HOURS.map(h => [h, v])) } : r) })
    }

    const addShiftDock = () => {
        const dock = newShiftDock.trim().toUpperCase()
        if (!dock || draft.shift.some(r => r.dock === dock)) return
        edit({ ...draft, shift: [...draft.shift, { dock, caps: { '1st': '', '2nd': '', '3rd': '' } }] })
        setNewShiftDock('')
    }
    const addGridDock = () => {
        const dock = newGridDock.trim().toUpperCase()
        if (!dock || draft.grid.some(r => r.dock === dock)) return
        edit({ ...draft, grid: [...draft.grid, { dock, caps: Object.fromEntries(HOURS.map(h => [h, ''])) }] })
        setNewGridDock('')
    }

    const save = async () => {
        const result = fromDraft(draft)
        if ('error' in result) { setMessage({ ok: false, text: result.error }); return }
        if (!window.confirm('Save dock capacity? Everyone gets the new values the next time they load the app.')) return
        setSaving(true)
        try {
            const res = await api.post<DockCapacityRows>('/api/set_dock_capacity', result.rows)
            setCapacity(fromRows(res.data) ?? BUILT_IN_DOCK_CAPACITY)
            setDirty(false)
            setMessage({ ok: true, text: 'Saved.' })
        } catch (e) {
            setMessage({ ok: false, text: errorText(e) })
        } finally {
            setSaving(false)
        }
    }

    if (saving) return <Circles />

    const savedCount = toRows(capacity)

    return (
        <div style={{ margin: '3% auto', width: '92vw' }}>
            <h3>Dock Capacity</h3>
            <p style={{ color: capacity.source === 'defaults' ? '#d97706' : '#888' }}>
                {capacity.source === 'defaults'
                    ? 'Using the built-in values: nothing has been saved in this environment yet. Saving stores these (or your edits) as the configuration.'
                    : `Saved configuration: ${savedCount.shift.length} shift and ${savedCount.hourly.length} hourly values.`}
            </p>

            {/* ── Per shift ── */}
            <h4 style={{ marginTop: '2%' }}>Trailers per shift</h4>
            <p style={{ color: '#888', margin: 0 }}>
                The live sheet's dock buttons, Dock Splits and the overview chart. Blank = no limit (as D and P have today).
            </p>
            <table style={{ borderCollapse: 'collapse', marginTop: '1%' }}>
                <thead>
                    <tr>
                        <th style={th}>Dock</th>
                        {SHIFTS.map(s => <th key={s} style={th}>{s}</th>)}
                        <th style={th}></th>
                    </tr>
                </thead>
                <tbody>
                    {draft.shift.map((r, i) => (
                        <tr key={r.dock}>
                            <td style={{ ...td, fontWeight: 600 }}>{r.dock}</td>
                            {SHIFTS.map(s => (
                                <td key={s} style={td}>
                                    <input style={num} value={r.caps[s]} onChange={e => setShiftCell(i, s, e.target.value)} />
                                </td>
                            ))}
                            <td style={td}>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => edit({ ...draft, shift: draft.shift.filter((_, j) => j !== i) })}>
                                    Remove
                                </button>
                            </td>
                        </tr>
                    ))}
                    <tr>
                        <td style={td}><input style={{ width: 60 }} placeholder="Dock" value={newShiftDock} onChange={e => setNewShiftDock(e.target.value)} /></td>
                        <td style={td} colSpan={4}><button className="btn btn-sm btn-outline-secondary" onClick={addShiftDock}>Add dock</button></td>
                    </tr>
                </tbody>
            </table>

            {/* ── Hourly ── */}
            <h4 style={{ marginTop: '3%' }}>Trailers per hour</h4>
            <p style={{ color: '#888', margin: 0 }}>
                Which hours the Exception, DY and IO logs offer as available, and Dock Splits' hourly limits. Blank = that hour isn't offered.
            </p>
            <div style={{ overflowX: 'auto', marginTop: '1%' }}>
                <table style={{ borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={th}>Dock</th>
                            {HOURS.map(h => <th key={h} style={th}>{String(h).padStart(2, '0')}</th>)}
                            <th style={th}>Fill row</th>
                            <th style={th}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {draft.grid.map((r, i) => (
                            <tr key={r.dock}>
                                <td style={{ ...td, fontWeight: 600 }}>{r.dock}</td>
                                {HOURS.map(h => (
                                    <td key={h} style={td}>
                                        <input style={{ ...num, width: 34 }} value={r.caps[h]} onChange={e => setGridCell(i, h, e.target.value)} />
                                    </td>
                                ))}
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                    <input style={{ ...num, width: 34 }} value={fill[r.dock] ?? ''}
                                        onChange={e => setFill(prev => ({ ...prev, [r.dock]: e.target.value }))} />{' '}
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => fillRow(i)}>Fill</button>
                                </td>
                                <td style={td}>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => edit({ ...draft, grid: draft.grid.filter((_, j) => j !== i) })}>
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td style={td}><input style={{ width: 60 }} placeholder="Dock" value={newGridDock} onChange={e => setNewGridDock(e.target.value)} /></td>
                            <td style={td} colSpan={HOURS.length + 2}><button className="btn btn-sm btn-outline-secondary" onClick={addGridDock}>Add dock</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: '2%' }}>
                <button className="btn btn-primary" onClick={save} disabled={!dirty && capacity.source === 'database'}>Save</button>
                <button className="btn btn-outline-secondary" disabled={!dirty} onClick={() => { setDraft(toDraft(capacity)); setDirty(false); setMessage(null) }}>
                    Discard changes
                </button>
                <button className="btn btn-outline-secondary" onClick={() => edit(toDraft(BUILT_IN_DOCK_CAPACITY))}>
                    Load built-in values
                </button>
                {message && <span style={{ color: message.ok ? 'green' : 'red' }}>{message.text}</span>}
            </div>
        </div>
    )
}

export default DockCapacity
