import { useCallback, useEffect, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import { wsStatus, wsReconnect, user as userAtom, type WsStatus as Status } from '../signals/signals'
import { api, logout } from '../utils/api'

const META: Record<Status, { label: string; color: string }> = {
    open:       { label: 'Live',       color: 'limegreen' },
    connecting: { label: 'Connecting', color: 'orange' },
    closed:     { label: 'Offline',    color: '#ff5555' },
}

const TICK_MS           = 30_000      // how often the automatic check considers running
const OFFLINE_EVERY_MS  = 30_000      // socket not open: check this often
const ONLINE_EVERY_MS   = 5 * 60_000  // socket open: still check the session this often

/**
 * Socket health plus who is signed in. A dropped socket is otherwise invisible —
 * the boards just stop updating — so this is the one place it shows.
 *
 * The session is re-checked automatically, and on click:
 *  - every 30 s while the socket isn't open, so it reconnects as soon as the
 *    server or session is back rather than retrying against a stale session;
 *  - every 5 min while it is — an open socket never re-checks the sign-in, so an
 *    expired or revoked session would otherwise go unnoticed until a save failed;
 *  - when the tab becomes visible again (laptop sleep, long time in another tab).
 * A refused session signs the user out, dropping the app to the login screen.
 */
const WsStatus = () => {
    const [status] = useAtom<Status>(wsStatus)
    const [reconnect] = useAtom(wsReconnect)
    const [u] = useAtom(userAtom)
    // Dims the indicator for a click only; automatic checks run without flicker
    const [checking, setChecking] = useState(false)

    const inFlight  = useRef(false)
    const lastCheck = useRef(Date.now())
    // The timers outlive renders, so they read the latest values through refs
    const statusRef    = useRef(status)
    const reconnectRef = useRef(reconnect)
    statusRef.current    = status
    reconnectRef.current = reconnect

    const recheck = useCallback(async (manual: boolean) => {
        if (inFlight.current) return
        inFlight.current = true
        if (manual) setChecking(true)
        try {
            // A signed-in GET, not /api/refresh: refresh swaps the sign-in token on
            // every call, so two tabs checking at once would race and one would be
            // signed out with the token the other just replaced. If the access token
            // has lapsed the api interceptor renews it, which is also what the
            // socket handshake needs before reconnecting.
            await api.get('/api/my_permissions')
            if (statusRef.current !== 'open') reconnectRef.current?.()
        } catch (error: any) {
            // Still unauthorised after the interceptor's renewal: the session is done.
            if (error?.response?.status === 401) {
                await logout()
                return
            }
            // No response at all — the server or network is down, which is what the
            // indicator is already reporting. Signing out here would only hide that
            // behind a login screen that cannot reach the server either.
            console.log('Session re-check could not reach the server', error)
        } finally {
            inFlight.current = false
            lastCheck.current = Date.now()
            if (manual) setChecking(false)
        }
    }, [])

    useEffect(() => {
        if (!u.email) return

        const tick = () => {
            if (document.hidden) return
            const since = Date.now() - lastCheck.current
            const due = statusRef.current === 'open' ? since >= ONLINE_EVERY_MS : since >= OFFLINE_EVERY_MS
            if (due) recheck(false)
        }
        // Coming back to the tab is when a session or socket has most likely died
        const onVisible = () => {
            if (!document.hidden && Date.now() - lastCheck.current >= OFFLINE_EVERY_MS) recheck(false)
        }

        const timer = setInterval(tick, TICK_MS)
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [u.email, recheck])

    const meta = META[status] ?? META.closed

    return (
        <div
            onClick={() => recheck(true)}
            title={`${u.email || 'Not signed in'}${u.role ? ` (${u.role})` : ''} — socket ${status}. Checked automatically; click to check now.`}
            style={{
                display:     'flex',
                alignItems:  'center',
                gap:         7,
                marginLeft:  'auto',
                cursor:      checking ? 'progress' : 'pointer',
                fontSize:    12,
                fontWeight:  500,
                color:       meta.color,
                userSelect:  'none',
                opacity:     checking ? 0.6 : 1,
            }}
        >
            <span
                className={status === 'open' ? undefined : 'ws-dot-pulse'}
                style={{
                    width:        9,
                    height:       9,
                    borderRadius: '50%',
                    background:   meta.color,
                    flexShrink:   0,
                }}
            />
            <span>{meta.label}</span>
            {u.email && (
                <span style={{
                    color:        '#9ca3af',
                    fontWeight:   400,
                    maxWidth:     180,
                    overflow:     'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace:   'nowrap',
                }}>
                    {u.email}
                </span>
            )}
        </div>
    )
}

export default WsStatus
