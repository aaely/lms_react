import { type TrailerRecord } from '../signals/signals'
import { api } from './api'

/*
 * Saves a Live Sheet / Next Shift trailer edit through update_live_trailer,
 * telling the server which fields the edit changes. The server compares and
 * writes only those, so the rest of a stale row on this screen can't overwrite
 * someone else's save or trip a permission this edit never used.
 */

// The fields update_live_trailer writes (permissions.rs editable_fields)
const EDITABLE: (keyof TrailerRecord)[] = [
    'gateArrivalTime', 'gateArrivalDate', 'door', 'doorArrivalTime', 'doorArrivalDate',
    'actualStartTime', 'actualStartDate', 'actualEndTime', 'actualEndDate',
    'trailer1', 'trailer2', 'statusOX', 'stat',
    'ryderComments', 'gmComments', 'dockComments', 'loadComments',
    'hour', 'dockCode', 'scac', 'adjustedStartTime', 'scheduleEndDate', 'scheduleEndTime',
]

const norm = (v: unknown) => v === null || v === undefined ? '' : String(v)

export const changedFields = (original: TrailerRecord, updated: TrailerRecord): string[] =>
    EDITABLE.filter(f => norm(original[f]) !== norm(updated[f]))

/** The server's reason for refusing a save, for showing to the user. */
export const saveErrorText = (e: any): string =>
    typeof e?.response?.data === 'string' && e.response.data ? e.response.data : 'The change was not saved.'

/**
 * Resolves to `{ data }` like api.post, so callers read `.data` either way.
 * Nothing changed: no request, the original comes back. A refusal (e.g. the role
 * can't make this change) is shown to the user and rethrown so the caller stops.
 */
export const saveTrailer = async (
    updated: TrailerRecord,
    original: TrailerRecord | undefined,
): Promise<{ data: TrailerRecord }> => {
    // Without the original, send no list and let the server compare every field
    const fields = original ? changedFields(original, updated) : undefined
    if (original && fields!.length === 0) return { data: original }
    try {
        const res = await api.post<TrailerRecord>('/api/update_live_trailer', { ...updated, changedFields: fields ?? [] })
        return { data: res.data }
    } catch (e) {
        window.alert(saveErrorText(e))
        throw e
    }
}
