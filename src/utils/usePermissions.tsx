import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'
import { permissions } from '../signals/permissions'
import { api } from './api'

/** Loads the role's permissions once signed in. Mounted in App next to useWS. */
export const useLoadPermissions = () => {
    const [u] = useAtom(user)
    const [, setPermissions] = useAtom(permissions)

    useEffect(() => {
        if (!u.email) return
        api.get<{ role: string; actions: string[]; labels: Record<string, string> }>('/api/my_permissions')
            .then(res => setPermissions({ role: res.data.role, actions: new Set(res.data.actions), labels: res.data.labels }))
            .catch(error => console.error('Failed to load permissions', error))
    }, [u.email, setPermissions])
}

/** `can(action)` and the reason it can't, for tooltips. */
const usePermissions = () => {
    const [p] = useAtom(permissions)
    const can = (action: string) => p.actions.has(action)
    const why = (action: string) =>
        `Your role (${p.role || 'unknown'}) can't use ${p.labels[action] ?? action}`
    return { can, why }
}

/**
 * Renders an action control as usual when the role may use it; otherwise
 * unclickable, with the reason on hover. `dim` greys it out — on for buttons,
 * off for recorded values (a time, a comment) that should stay readable.
 */
export const Allowed = ({ action, dim = true, children }: { action: string; dim?: boolean; children: React.ReactNode }) => {
    const { can, why } = usePermissions()
    if (can(action)) return <>{children}</>
    return (
        <span title={why(action)} style={{ display: 'inline-block', cursor: 'not-allowed', opacity: dim ? 0.45 : 1 }}>
            <span style={{ pointerEvents: 'none' }}>{children}</span>
        </span>
    )
}

export default usePermissions
