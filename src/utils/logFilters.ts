/**
 * Filtering and delete rules shared by the Exception Log and the DY
 * Communication Log; the controls are in components/LogFilters.tsx. Filtering
 * is done on the loaded entries; nothing goes to the server.
 */

// from/to are datetime-local values (YYYY-MM-DDTHH:MM), compared as text
// against each entry's date + time from atTime.
export const EMPTY_LOG_FILTERS = { requestor: '', dock: '', route: '', loadNum: '', trailer: '', from: '', to: '' }
export type LogFilters = typeof EMPTY_LOG_FILTERS

/** What a log entry is filtered on, pulled out of its own field names. */
export interface LogFilterFields {
    requestor: string
    dock:      string
    route:     string
    loadNum:   string
    /** Every trailer on the entry; the filter matches any of them */
    trailers:  (string | undefined)[]
    at:        string
}

/** Case-insensitive "contains"; an empty query matches everything. */
const contains = (value: string | undefined, query: string) =>
    !query.trim() || (value ?? '').toLowerCase().includes(query.trim().toLowerCase())

/** A date (time part ignored) and HH:MM time as one comparable YYYY-MM-DDTHH:MM. No time counts as 00:00. */
export const atTime = (date: string | undefined, time: string | undefined) =>
    `${(date ?? '').slice(0, 10)}T${time || '00:00'}`

export const matchesLogFilters = (e: LogFilterFields, f: LogFilters) =>
    (!f.requestor || e.requestor === f.requestor)
    && (!f.dock || (e.dock ?? '').toUpperCase() === f.dock)
    && contains(e.route, f.route)
    && contains(e.loadNum, f.loadNum)
    && (!f.trailer.trim() || e.trailers.some(t => !!t && contains(t, f.trailer)))
    && (!f.from || e.at >= f.from)
    && (!f.to || e.at <= f.to)

/** Distinct, sorted requestors for the filter dropdown. */
export const distinctRequestors = (values: (string | undefined)[]) =>
    [...new Set(values.filter((v): v is string => !!v))].sort()

// Only these roles see the delete button; the server refuses anyone else
export const CAN_DELETE_ROLES = new Set(['admin', 'manager'])

/** The server's reason for a refused request, or the fallback. */
export const serverReason = (error: unknown, fallback: string): string => {
    const data = (error as { response?: { data?: unknown } } | null)?.response?.data
    return typeof data === 'string' && data ? data : fallback
}
