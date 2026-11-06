import { Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";

/**
 * The entries-list filters and delete button shared by the Exception Log and
 * the DY Communication Log. Filtering is done on the loaded entries; nothing
 * goes to the server.
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

export const LogFilterBar = ({ filters, setFilters, requestors, docks, timeLabel, shown, total }: {
    filters:    LogFilters
    setFilters: React.Dispatch<React.SetStateAction<LogFilters>>
    requestors: string[]
    docks:      string[]
    /** "Schedule" or "Delivery": labels the from/to pickers */
    timeLabel:  string
    shown:      number
    total:      number
}) => {
    const set = (key: keyof LogFilters) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setFilters(prev => ({ ...prev, [key]: e.target.value }))
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', width: '100%', mb: 2 }}>
            <TextField select size="small" label="Requestor" value={filters.requestor} onChange={set('requestor')} sx={{ minWidth: 220 }}>
                <MenuItem value="">All</MenuItem>
                {requestors.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Dock" value={filters.dock} onChange={set('dock')} sx={{ minWidth: 100 }}>
                <MenuItem value="">All</MenuItem>
                {docks.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Load #" value={filters.loadNum} onChange={set('loadNum')} sx={{ width: 140 }} />
            <TextField size="small" label="Route" value={filters.route} onChange={set('route')} sx={{ width: 140 }} />
            <TextField size="small" label="Trailer" value={filters.trailer} onChange={set('trailer')} sx={{ width: 140 }} />
            <TextField size="small" type="datetime-local" label={`${timeLabel} from`} value={filters.from} onChange={set('from')}
                slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="datetime-local" label={`${timeLabel} to`} value={filters.to} onChange={set('to')}
                slotProps={{ inputLabel: { shrink: true } }} />
            <Button variant="outlined" onClick={() => setFilters(EMPTY_LOG_FILTERS)}>Clear</Button>
            <Typography variant="body2" sx={{ ml: 'auto' }}>
                Showing {shown} of {total}
            </Typography>
        </Box>
    )
}

/** Distinct, sorted requestors for the filter dropdown. */
export const distinctRequestors = (values: (string | undefined)[]) =>
    [...new Set(values.filter((v): v is string => !!v))].sort()

// Only these roles see the delete button; the server refuses anyone else
export const CAN_DELETE_ROLES = new Set(['admin', 'manager'])

const TrashIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
    </svg>
)

export const DeleteEntryButton = ({ loadNum, onClick }: { loadNum: string; onClick: () => void }) => (
    <IconButton aria-label={`Delete entry for load ${loadNum}`} title="Delete entry" color="error" onClick={onClick}>
        <TrashIcon />
    </IconButton>
)

/** The server's reason for a refused request, or the fallback. */
export const serverReason = (error: any, fallback: string): string =>
    typeof error?.response?.data === 'string' && error.response.data ? error.response.data : fallback
