import { useState } from 'react'
import { useAtom } from 'jotai'
import { wsStatus, wsReconnect, user as userAtom, type WsStatus as Status } from '../signals/signals'
import { api, logout } from '../utils/api'

const META: Record<Status, { label: string; color: string }> = {
    open:       { label: 'Live',       color: 'limegreen' },
    connecting: { label: 'Connecting', color: 'orange' },
    closed:     { label: 'Offline',    color: '#ff5555' },
}

/**
 * Socket health plus who is signed in. A dropped socket is otherwise invisible —
 * the boards just stop updating — so this is the one place it shows.
 *
 * Clicking re-checks the session against /api/refresh. A refused session signs the
 * user out, which drops the app to the login screen; that is the answer to "am I
 * still logged in?". A live session with a dead socket retries the connection at
 * once rather than waiting out the backoff.
 */
const WsStatus = () => {
    const [status] = useAtom<Status>(wsStatus)
    const [reconnect] = useAtom(wsReconnect)
    const [u] = useAtom(userAtom)
    const [checking, setChecking] = useState(false)

    const meta = META[status] ?? META.closed

    const recheck = async () => {
        if (checking) return
        setChecking(true)
        try {
            // Refreshing first matters: the ws handshake needs a valid cookie, so
            // retrying a dead socket against a stale session just fails again.
            // /api/refresh answers a dead token with 200 and a bare error string,
            // so a good session is proven by the user payload, not by the status.
            const res = await api.post('/api/refresh')
            if (!res.data?.user?.username) {
                await logout()
                return
            }
            if (status !== 'open') reconnect?.()
        } catch (error: any) {
            // The server answered and refused: the session is done.
            if (error?.response) {
                await logout()
                return
            }
            // No response at all — the server or network is down, which is what the
            // indicator is already reporting. Signing out here would only hide that
            // behind a login screen that cannot reach the server either.
            console.log('Session re-check could not reach the server', error)
        } finally {
            setChecking(false)
        }
    }

    return (
        <div
            onClick={recheck}
            title={`${u.email || 'Not signed in'}${u.role ? ` (${u.role})` : ''} — socket ${status}. Click to re-check.`}
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
