import { atom } from 'jotai'

/*
 * What the signed-in user's role may do on the Live Sheet and Next Shift, from
 * /api/my_permissions (mgo_backend src/permissions.rs — the one table the server
 * enforces). Loaded at sign-in by useLoadPermissions. Until it arrives nothing is
 * enabled, so a slow load can't briefly offer something the server would refuse.
 */

export interface Permissions {
    role:    string
    actions: Set<string>
    /** Every action's name as the screens show it */
    labels:  Record<string, string>
}

export const permissions = atom<Permissions>({ role: '', actions: new Set<string>(), labels: {} })
