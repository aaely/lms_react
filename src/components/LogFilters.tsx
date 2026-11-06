import { Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { EMPTY_LOG_FILTERS, type LogFilters } from "../utils/logFilters";

/**
 * The entries-list filter bar and delete button shared by the Exception Log and
 * the DY Communication Log. The filtering itself is in utils/logFilters.ts.
 */

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
