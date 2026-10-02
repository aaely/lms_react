import { useEffect, useState } from 'react'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'
import { fromList, routeBlackouts, routeKey, toList, type RouteBlackout, type RouteBlackouts as Blackouts } from '../signals/routeBlackouts'
import { api } from '../utils/api'
import Circles from './Loader'

/*
 * Admin editor for route blackouts (signals/routeBlackouts.ts; mgo_backend
 * src/route_blackouts.rs): delivery hours a route can't be delivered in. The
 * Exception Log and DY Log won't schedule into them. Saving pushes the change to
 * every open screen.
 */

// Operating-day order, grouped by shift (3rd starts at 22:00)
const SHIFT_GROUPS = [
    { label: '3rd (22–05)', hours: [22, 23, 0, 1, 2, 3, 4, 5] },
    { label: '1st (06–13)', hours: [6, 7, 8, 9, 10, 11, 12, 13] },
    { label: '2nd (14–21)', hours: [14, 15, 16, 17, 18, 19, 20, 21] },
]
const HOURS = SHIFT_GROUPS.flatMap(g => g.hours)

const copy = (b: Blackouts): Blackouts => new Map([...b].map(([route, hours]) => [route, new Set(hours)]))

const errorText = (e: any): string =>
    typeof e?.response?.data === 'string' && e.response.data ? e.response.data : (e?.message ?? 'Save failed')

const th: React.CSSProperties = { padding: '4px 2px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', fontSize: '0.75rem', textAlign: 'center' }
const td: React.CSSProperties = { padding: '2px', borderBottom: '1px solid #eee', textAlign: 'center' }
const shiftEdge = (h: number) => h === 22 || h === 6 || h === 14 ? '2px solid #999' : undefined

const RouteBlackouts = () => {
    const [u] = useAtom(user)
    const [saved, setSaved] = useAtom(routeBlackouts)
    const [draft, setDraft] = useState<Blackouts>(() => copy(saved))
    const [dirty, setDirty] = useState(false)
    const [newRoute, setNewRoute] = useState('')
    const [filter, setFilter] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    // Loaded or pushed blackouts replace the draft unless this admin is editing;
    // our own save is broadcast back, possibly before its response lands.
    useEffect(() => {
        if (saving) return
        if (!dirty) { setDraft(copy(saved)); return }
        setMessage({
            ok: false,
            text: 'Someone else saved Route Blackouts while you were editing. Saving replaces their changes; Discard changes loads theirs.',
        })
    }, [saved])  // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { if (!dirty) setDraft(copy(saved)) }, [dirty])  // eslint-disable-line react-hooks/exhaustive-deps

    if (u.role !== 'admin') {
        return <p style={{ margin: '5%' }}>Route blackouts are admin only.</p>
    }

    const edit = (change: (next: Blackouts) => void) => {
        const next = copy(draft)
        change(next)
        setDraft(next)
        setDirty(true)
        setMessage(null)
    }

    const toggle = (route: string, hour: number) => edit(next => {
        const hours = next.get(route)!
        if (hours.has(hour)) hours.delete(hour); else hours.add(hour)
    })

    const addRoute = () => {
        const route = routeKey(newRoute)
        if (!route) return
        if (draft.has(route)) { setFilter(route); setNewRoute(''); return }
        edit(next => { next.set(route, new Set()) })
        setNewRoute('')
    }

    const save = async () => {
        const list = toList(draft)
        const dropped = [...draft].filter(([, hours]) => hours.size === 0).map(([route]) => route)
        if (!window.confirm(
            `Save route blackouts for ${list.length} route(s)?` +
            (dropped.length > 0 ? `\n\n${dropped.join(', ')} ha${dropped.length === 1 ? 's' : 've'} no blacked-out hours and will be removed.` : '') +
            '\n\nOpen Exception and DY Log screens pick this up straight away.'
        )) return

        setSaving(true)
        try {
            const res = await api.post<RouteBlackout[]>('/api/set_route_blackouts', list)
            setSaved(fromList(res.data))
            setDirty(false)
            setMessage({ ok: true, text: 'Saved.' })
        } catch (e) {
            setMessage({ ok: false, text: errorText(e) })
        } finally {
            setSaving(false)
        }
    }

    if (saving) return <Circles />

    const routes = [...draft.keys()].sort().filter(r => r.includes(routeKey(filter)))

    return (
        <div style={{ margin: '3% auto', width: '92vw' }}>
            <h3>Route Blackouts</h3>
            <p style={{ color: '#888' }}>
                Red hours are blacked out: the route can't be delivered then. The Exception Log and DY Log
                won't offer or accept a delivery time in one. Routes match on the full route ID.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '1% 0' }}>
                <input placeholder="Route ID" value={newRoute} onChange={e => setNewRoute(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addRoute() }} />
                <button className="btn btn-sm btn-outline-secondary" onClick={addRoute}>Add route</button>
                <input placeholder="Filter routes" value={filter} onChange={e => setFilter(e.target.value)} style={{ marginLeft: 'auto' }} />
            </div>

            {routes.length === 0 ? (
                <p style={{ color: '#888' }}>{draft.size === 0 ? 'No routes are restricted.' : 'No routes match the filter.'}</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
                        <thead>
                            <tr>
                                <th style={th}></th>
                                {SHIFT_GROUPS.map(g => (
                                    <th key={g.label} colSpan={g.hours.length} style={{ ...th, borderLeft: '2px solid #999' }}>{g.label}</th>
                                ))}
                                <th style={th}></th>
                            </tr>
                            <tr>
                                <th style={th}>Route</th>
                                {HOURS.map(h => (
                                    <th key={h} style={{ ...th, borderLeft: shiftEdge(h) }}>{String(h).padStart(2, '0')}</th>
                                ))}
                                <th style={th}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {routes.map(route => {
                                const hours = draft.get(route)!
                                return (
                                    <tr key={route}>
                                        <td style={{ ...td, fontWeight: 600, textAlign: 'left', paddingRight: 8 }}>{route}</td>
                                        {HOURS.map(h => {
                                            const off = hours.has(h)
                                            return (
                                                <td key={h} style={{ ...td, borderLeft: shiftEdge(h) }}>
                                                    <button
                                                        onClick={() => toggle(route, h)}
                                                        title={`${route} ${String(h).padStart(2, '0')}:00 — ${off ? 'blacked out' : 'open'}`}
                                                        style={{
                                                            width: 28, height: 24, border: '1px solid #ccc', borderRadius: 3,
                                                            background: off ? '#dc3545' : '#f5f5f5',
                                                            color: off ? 'white' : '#bbb', fontSize: '0.7rem', cursor: 'pointer',
                                                        }}
                                                    >
                                                        {off ? '✕' : ''}
                                                    </button>
                                                </td>
                                            )
                                        })}
                                        <td style={{ ...td, whiteSpace: 'nowrap', paddingLeft: 8 }}>
                                            <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(n => { n.set(route, new Set(HOURS)) })}>All</button>{' '}
                                            <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(n => { n.set(route, new Set()) })}>Clear</button>{' '}
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => edit(n => { n.delete(route) })}>Remove</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: '2%' }}>
                <button className="btn btn-primary" onClick={save} disabled={!dirty}>Save</button>
                <button className="btn btn-outline-secondary" disabled={!dirty} onClick={() => { setDirty(false); setMessage(null) }}>
                    Discard changes
                </button>
                {message && <span style={{ color: message.ok ? 'green' : 'red' }}>{message.text}</span>}
            </div>
        </div>
    )
}

export default RouteBlackouts
