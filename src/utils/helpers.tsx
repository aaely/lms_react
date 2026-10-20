import { type TrailerRecord } from "../signals/signals";


// Docks worked inside the plant — everything that is not an offsite yard (U/V)
// or the dropyard (Y). One definition, so "Plant" means the same on every sheet.
export const PLANT_DOCKS = new Set(['A', 'BE', 'BN', 'BW', 'D', 'E', 'F', 'F1', 'P'])

const normalizeDock = (dock: string): string => (dock ?? '').trim().toUpperCase()

/**
 * Rows behind a dock button. '' and 'All' clear the filter, 'plant' takes every
 * plant dock, anything else is that dock code. Codes are compared trimmed and
 * case-insensitively — they arrive padded from LMS.
 */
export const filterTrailersByDock = (trailers: TrailerRecord[], dock: string): TrailerRecord[] => {
    const d = normalizeDock(dock)
    if (d === '' || d === 'ALL') return trailers
    if (d === 'PLANT') return trailers.filter(t => PLANT_DOCKS.has(normalizeDock(t.dockCode)))
    return trailers.filter(t => normalizeDock(t.dockCode) === d)
}

/** True while a plant dock (or Plant itself) is selected, so the per-dock row shows. */
export const isPlantDockView = (dock: string): boolean => {
    const d = normalizeDock(dock)
    return d === 'PLANT' || PLANT_DOCKS.has(d)
}

export const isDetention = (trailer: TrailerRecord, now: Date = new Date()): [boolean, number] => {
        if (!trailer.scheduleStartDate || !trailer.adjustedStartTime) return [false, 0];
        
        if (trailer.actualEndTime || trailer.statusOX === 'L' || !trailer.gateArrivalTime || trailer.statusOX === 'R') return [false, 0];
        
        const [year, month, day] = trailer.scheduleStartDate.split('-').map(Number);
        
        const [hours, minutes] = trailer.adjustedStartTime.split(':').map(Number);

        const scheduledDate = new Date(year, month - 1, day, hours, minutes);
        
        
        const diffMs = now.getTime() - scheduledDate.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        //const detentionStartTime = scheduledDate.getTime() + (60 * 60 * 1000)
        return [diffMinutes > 60, diffMinutes]
    };

// ── Where a checked-in trailer is stuck ─────────────────────────────────────
// The Live Sheet flashes a row for the stage a trailer is stuck at, so it shows
// what to do to keep it moving rather than a bare detention warning:
//   blue   — checked in at the gate 15+ min ago, not yet sent back to the dock
//   yellow — sent back 15+ min ago, not yet in a door
//   red    — in a door, and past detention (60 min after the scheduled start)
// Late trailers never reach detention, but still get blue and yellow so they
// are still sent back and put in a door. Dropyard (Y) trailers and ARS shuttle
// routes aren't monitored.

const STAGE_MINUTES = 15

/** 'h:mm(:ss) AM/PM' (gate times) or 'HH:MM(:SS)' -> [hours, minutes]. */
const parseClock = (time: string | undefined): [number, number] | null => {
    const m = (time ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?$/)
    if (!m) return null
    let h = Number(m[1])
    const min = Number(m[2])
    const ampm = m[3]?.toLowerCase()
    if (ampm) h = (h % 12) + (ampm === 'pm' ? 12 : 0)
    return h <= 23 && min <= 59 ? [h, min] : null
}

const atClock = (date: string, clock: [number, number]): Date | null => {
    const [y, mo, d] = (date ?? '').split('-').map(Number)
    if (!y || !mo || !d) return null
    return new Date(y, mo - 1, d, clock[0], clock[1])
}

/** When the trailer checked in at the gate. "Not Late" sets no date, so fall back to the schedule's. */
export const gateArrivedAt = (t: TrailerRecord): Date | null => {
    const clock = parseClock(t.gateArrivalTime)
    return clock ? atClock(t.gateArrivalDate || t.scheduleStartDate, clock) : null
}

/**
 * When the trailer was sent back to the dock, read from the GM Comments note the
 * Live Sheet pre-fills ("… was sent back at HH:MM …"). The note has no date: it's
 * the gate arrival's day, or the next one if the time is earlier than arrival.
 */
export const sentBackAt = (t: TrailerRecord): Date | null => {
    const m = (t.gmComments ?? '').match(/sent back at\s*(\d{1,2}:\d{2})/i)
    const clock = m ? parseClock(m[1]) : null
    const gate = gateArrivedAt(t)
    if (!clock || !gate) return null
    const sent = atClock(t.gateArrivalDate || t.scheduleStartDate, clock)
    if (sent && sent < gate) sent.setDate(sent.getDate() + 1)
    return sent
}

const minutesSince = (d: Date, now: Date) => (now.getTime() - d.getTime()) / 60_000

/** Dropyard trailers and ARS shuttles: not monitored, so never flashed. */
export const unmonitored = (t: TrailerRecord): boolean =>
    (t.dockCode ?? '').trim().toUpperCase() === 'Y' || (t.routeId ?? '').trim().toUpperCase().startsWith('ARS')

/** U and V record a door arrival and door number; plant docks don't. */
const usesDoorArrival = (t: TrailerRecord) => ['U', 'V'].includes((t.dockCode ?? '').trim().toUpperCase())

/**
 * Put in a door: at U/V, a door arrival with a door number set; at a plant dock,
 * where neither is recorded, unloading having started.
 */
export const inDoor = (t: TrailerRecord): boolean =>
    usesDoorArrival(t) ? !!t.doorArrivalTime && !!t.door?.trim() : !!t.actualStartTime

// Emptied or rescheduled off the sheet: no stage applies
const doneWith = (t: TrailerRecord) => !!t.actualEndTime || t.statusOX === 'R'

/** Checked in more than 15 minutes ago and still not sent back (nor already in a door). */
export const awaitingSendBack = (t: TrailerRecord, now = new Date()): boolean => {
    const gate = gateArrivedAt(t)
    return !!gate && !doneWith(t) && !inDoor(t) && !t.actualStartTime && !sentBackAt(t)
        && minutesSince(gate, now) > STAGE_MINUTES
}

/** Sent back more than 15 minutes ago and still not in a door. */
export const sentBackNotInDoor = (t: TrailerRecord, now = new Date()): boolean => {
    const sent = sentBackAt(t)
    return !!sent && !doneWith(t) && !inDoor(t) && minutesSince(sent, now) > STAGE_MINUTES
}

/**
 * The row's flashing warning: the earliest stage the trailer is stuck at, so it
 * says where the truck is. Detention only flashes once it's in a door; before
 * that the detention clock still shows in the Dock Stop Sequence column.
 */
export const trailerAlertClass = (t: TrailerRecord, now = new Date()): string => {
    if (unmonitored(t))             return ''
    if (awaitingSendBack(t, now))   return 'gate-wait-flash'
    if (sentBackNotInDoor(t, now))  return 'sent-back-flash'
    if (isDetention(t, now)[0])     return 'detention-flash'
    return ''
}

export const formatDetentionTime = (minutes: number): string => {
    const hrs  = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = Math.floor(minutes % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
};

export const isLate = (trailer: TrailerRecord): boolean => {
        if (!trailer.scheduleStartDate || !trailer.adjustedStartTime) return false;
        
        if (trailer.actualStartTime || trailer.actualEndTime) return false;
        
        const [year, month, day] = trailer.scheduleStartDate.split('-').map(Number);
        
        const [hours, minutes] = trailer.adjustedStartTime.split(':').map(Number);

        const scheduledDate = new Date(year, month - 1, day, hours, minutes);
        
        const now = new Date();
        
        const diffMs = now.getTime() - scheduledDate.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        return diffMinutes > 15;
    };

export const getBackground = (status: string) => {
        switch (status) {
            case 'O': {
                return 'green'
                }
            case 'R':{
                return 'gray'
                }
            case 'L':{
                return 'red'
                }
            case 'N':{
                return 'red'
                }
            case 'U':
                return 'gold'
            case 'P': {
                return 'orange'
            }
            case 'C': {
                return 'pink'
            }
            case 'A':
                return 'purple'
            default: return 'inherit'
        }
    }

// Sheet dates arrive as strings from CSV but as Excel serial numbers from XLSX
// (sheet_to_json defaults to raw: true), so normalize both to YYYY-MM-DD.
export const formatSheetDate = (val: any): string => {
    if (!val) return ''
    // Drop any time portion ("09/10/2026 06:00:00", "2026-09-10T06:00:00") —
    // serials have no space or T, so they pass through untouched
    const str = String(val).trim().split(/[ T]/)[0]
    if (!str || str === '0') return ''

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

    // M/D/YYYY or MM/DD/YYYY
    if (str.includes('/')) {
        const [m, d, y] = str.split('/')
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }

    // Excel serial
    if (/^\d+(\.\d+)?$/.test(str)) {
        const date = new Date((parseFloat(str) - 25569) * 86400 * 1000)
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }

    return str
}

// Rail ASNs report dock zero-padded ("0806") and sometimes suffixed ("803A").
// F1 was a label the old rail import applied to 806 for ULSV/EVRP; it folds back
// to 806 so ASNs already persisted in storage still match a dock button.
export const normalizeRailDock = (dock: any): string => {
    const raw = String(dock ?? '').trim()
    if (raw.toUpperCase() === 'F1') return '806'
    // Strip a trailing letter only off a multi-digit dock ("803A" -> "803").
    // Requiring 2+ digits keeps the 1R/3R/6R/8R deck codes intact, and leaves
    // non-numeric docks like EEEDY or the AF deck untouched.
    const stripped = raw.replace(/^(\d{2,})[A-Za-z]$/, '$1')
    if (/^\d+$/.test(stripped)) return String(parseInt(stripped))
    return raw
}

export const getStatBackground = (stat: string) => {
        switch (stat) {
            case 'O': {
                return 'orange'
                }
            case 'X': {
                return 'green'
                }
            default: return 'inherit'
        }
    }

export const getCardColor = (
    dockCode: string,
    activeDock: string,
    shift: string,
    total: number,
    // The dockCapacity atom's `shift`; passed in so the caller's render picks up
    // a configuration that loads after it first draws.
    shiftDockCapacity: Map<string, Record<string, number>>,
) => {
    // Get capacity for this shift, default to null if not found
    const shiftCapacity = shiftDockCapacity.get(shift);

    // If no capacity data for this shift, return basic active/inactive colors
    if (!shiftCapacity) {
        return dockCode === activeDock ? 'blue' : 'inherit';
    }

    // Get capacity for this specific dock, default to 0 if not found
    const capacity = shiftCapacity[dockCode] ?? 0;

    // Compare total against capacity
    if (total > capacity && capacity !== 0) {
        return dockCode === activeDock ? 'red' : 'orange';
    }

    // Within capacity
    return dockCode === activeDock ? 'blue' : 'inherit';
};