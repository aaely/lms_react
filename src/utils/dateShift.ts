import { type ScheduleRange, type TrailerRecord } from '../signals/signals'

/*
 * Guards for the dateShift stamp ("2026-11-03-2nd") when a shift's times don't
 * match the clock — a special shift set with the Schedule Builder's Range
 * Override, or an add-on made during one. The clock would file a 12:00–21:00
 * shift's first two hours under 1st.
 */

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Regular windows: 1st 06:00–13:59, 2nd 14:00–21:59, 3rd 22:00–05:59
const shiftAtHour = (h: number) => h >= 22 || h < 6 ? '3rd' : h >= 14 ? '2nd' : '1st'

/**
 * The shift a Range Override covers, judged by the range's midpoint so a shift
 * that starts or ends off the regular hours still lands on the one it mostly
 * covers: 2026-11-03 12:00–21:00 → 2026-11-03-2nd. 3rd is filed under the day it
 * starts. Null when the range is incomplete or ends before it starts.
 */
export const rangeDateShift = (range: ScheduleRange | null): string | null => {
    if (!range) return null
    const start = new Date(`${range.startDate}T${range.startTime}`)
    const end   = new Date(`${range.endDate}T${range.endTime}`)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null

    const mid = new Date((start.getTime() + end.getTime()) / 2)
    const shift = shiftAtHour(mid.getHours())
    if (shift === '3rd' && mid.getHours() < 6) mid.setDate(mid.getDate() - 1)
    return `${ymd(mid)}-${shift}`
}

/** "2026-11-03-2nd" → "2nd", for lookups keyed by shift alone. */
export const shiftOf = (dateShift: string): string => dateShift.slice(11)

/**
 * The dateShift a board's rows are filed under — the most common one, so a stray
 * carry-over doesn't decide it. Null for an empty board.
 */
export const boardDateShift = (rows: TrailerRecord[]): string | null => {
    const counts = new Map<string, number>()
    for (const r of rows) {
        if (r.dateShift) counts.set(r.dateShift, (counts.get(r.dateShift) ?? 0) + 1)
    }
    let best: string | null = null
    for (const [ds, n] of counts) {
        if (best === null || n > counts.get(best)!) best = ds
    }
    return best
}

/** The shift a roll moves into. 3rd ends after midnight, so 3rd -> 1st advances a day. */
export const nextDateShift = (date: string, shift: string): string => {
    if (!date) return ''
    if (shift === '1st') return `${date}-2nd`
    if (shift === '2nd') return `${date}-3rd`
    const [y, m, d] = date.split('-').map(Number)
    return `${ymd(new Date(y, m - 1, d + 1))}-1st`
}

/** "2026-11-03-3rd" → "2026-11-04-1st" */
export const followingDateShift = (dateShift: string): string =>
    nextDateShift(dateShift.slice(0, 10), shiftOf(dateShift))

/**
 * The shift the clock says is running. 3rd is filed under the day it starts, so
 * before 06:00 it belongs to yesterday. Only a last resort for an empty board —
 * it can't see a special shift or a roll that hasn't happened yet.
 */
export const clockDateShift = (): string => {
    const now = new Date()
    const shift = shiftAtHour(now.getHours())
    if (shift === '3rd' && now.getHours() < 6) now.setDate(now.getDate() - 1)
    return `${ymd(now)}-${shift}`
}

/**
 * The dateShift of the shift being staged. The Next Shift board mixes staged rows
 * with live trailers that arrived but aren't finished, and those still carry the
 * current shift's stamp — so rows on `current` (the live sheet's stamp) are left
 * out. With nothing staged yet, it is the shift after the current one.
 */
export const stagedDateShift = (board: TrailerRecord[], current: string | null): string | null =>
    boardDateShift(board.filter(r => r.dateShift !== current))
        ?? (current ? followingDateShift(current) : null)

export interface ShiftWindow { start: Date; end: Date }

const REGULAR_START: Record<string, number> = { '1st': 6, '2nd': 14, '3rd': 22 }

/**
 * The hours a dateShift covers: its regular 8-hour window (3rd runs into the next
 * morning), widened to take in the start times of the rows already filed under it
 * so a special shift's off-hours rows aren't called out. Carry-overs are skipped —
 * they're re-stamped at the roll but keep the earlier shift's times. Null for a
 * stamp that doesn't parse.
 */
export const shiftWindow = (dateShift: string, rows: TrailerRecord[] = []): ShiftWindow | null => {
    const [y, m, d] = dateShift.slice(0, 10).split('-').map(Number)
    const startHour = REGULAR_START[shiftOf(dateShift)]
    if (!y || !m || !d || startHour === undefined) return null

    let start = new Date(y, m - 1, d, startHour)
    let end   = new Date(y, m - 1, d, startHour + 8)
    for (const r of rows) {
        if (r.dateShift !== dateShift || r.statusOX === 'C') continue
        const at = new Date(`${r.scheduleStartDate}T${r.adjustedStartTime}`)
        if (isNaN(at.getTime())) continue
        if (at < start) start = at
        if (at > end)   end   = at
    }
    return { start, end }
}

/** The window `date` `time` falls outside of, or null when it's inside (or incomplete). */
export const outsideShiftWindow = (
    dateShift: string, date: string, time: string, rows: TrailerRecord[] = [],
): ShiftWindow | null => {
    if (!dateShift || !date || !time) return null
    const at      = new Date(`${date}T${time}`)
    const regular = shiftWindow(dateShift)
    const widened = shiftWindow(dateShift, rows)
    if (!regular || !widened || isNaN(at.getTime())) return null
    // The regular end is exclusive (14:00 belongs to 2nd); past it, only as far as
    // the latest row already on the shift.
    const inside = at >= widened.start && (at < regular.end || at <= widened.end && widened.end > regular.end)
    return inside ? null : widened
}
