import { type PartASL } from '../signals/signals'

/*
 * Running balance for a part over the ASL report's 21 days of requirements: walk
 * forward from the current balance (cbal), adding what scheduled IO trailers bring
 * in and subtracting each day's usage. Shared by IO Schedule and the IO page's
 * Low DOH tab, rendered by components/BalanceTable.
 */

export const BALANCE_DAYS = 21

export const fmtNum = (v: number | null | undefined): string =>
    v == null ? '—' : Number(v).toLocaleString()

export const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// ScheduleDate isn't saved in one consistent format. Read a leading YYYY-MM-DD as-is —
// new Date() would parse it as UTC midnight and shift it back a day in local time.
export const toDateKey = (val: string): string => {
    if (!val) return ''
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(val)
    if (iso) return iso[1]
    const d = new Date(val)
    return isNaN(d.getTime()) ? '' : formatDate(d)
}

// Day 1 is today, rolling to tomorrow after 22:00 — the same operational
// boundary Scan.tsx uses for its 6-day projection
export const getDay1Date = (): Date => {
    const now = new Date()
    const day1 = new Date(now)
    if (now.getHours() >= 22) day1.setDate(day1.getDate() + 1)
    day1.setHours(0, 0, 0, 0)
    return day1
}

// Column label for day n as MM.DD. Derived by advancing a copy of day1, so it
// rolls into the next month correctly rather than being parsed from a string.
export const dayLabel = (day1: Date, n: number): string => {
    const d = new Date(day1)
    d.setDate(d.getDate() + (n - 1))
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// Build the date from its parts so a YYYY-MM-DD string isn't shifted by UTC parsing
const scheduleDateValue = (val: string): number | null => {
    const key = toDateKey(val)
    if (!key) return null
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d).getTime()
}

// Quantity of `part` arriving on day n, taken from each trailer's scheduled date
// rather than an ASN EDA. Day 1 sweeps up anything scheduled on or before it.
const dayNInbound = (part: string, rows: any[], n: number, day1: Date): number => {
    const date = new Date(day1)
    date.setDate(day1.getDate() + (n - 1))
    const target = date.getTime()

    return rows.reduce((sum: number, trl: any) => {
        const entry = (trl.PartQtys ?? []).find((q: any) => q.part === part)
        if (!entry) return sum
        // Each quantity carries its own schedule date; fall back to the row's
        const scheduled = scheduleDateValue(entry.scheduleDate || trl.Schedule?.ScheduleDate)
        if (scheduled === null) return sum
        const arrives = n === 1 ? scheduled <= target : scheduled === target
        return arrives ? sum + Number(entry.quantity ?? 0) : sum
    }, 0)
}

// A typed-in quantity replaces that day's real inbound. Blank means "use the actual",
// so clearing a box always returns the row to reality.
const inboundForDay = (
    part: string, rows: any[], n: number, day1: Date,
    overrides?: Record<string, string>,
): number => {
    const raw = overrides?.[`${part}|${n}`]
    if (raw !== undefined && raw.trim() !== '') {
        const v = Number(raw)
        if (!isNaN(v)) return v
    }
    return dayNInbound(part, rows, n, day1)
}

export interface BalanceRows {
    /** What scheduled IO trailers bring in on each day */
    inbound:  number[]
    /** End-of-day balance */
    balances: number[]
}

// One inbound pass, then a forward prefix sum. Computing each column's balance by
// re-walking days 1..n was triangular — 231 inbound lookups per render instead of 21.
export const buildBalanceRows = (
    asl: PartASL, part: string, rows: any[], day1: Date,
    overrides?: Record<string, string>,
): BalanceRows => {
    const inbound: number[] = []
    for (let n = 1; n <= BALANCE_DAYS; n++) {
        inbound.push(inboundForDay(part, rows, n, day1, overrides))
    }

    const balances: number[] = []
    let balance = Number(asl.cbal ?? 0)
    for (let n = 1; n <= BALANCE_DAYS; n++) {
        balance += inbound[n - 1]
        balance -= Number((asl as any)[`day${n}`] ?? 0)
        balances.push(balance)
    }

    return { inbound, balances }
}
