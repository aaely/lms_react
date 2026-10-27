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
