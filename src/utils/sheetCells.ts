import * as XLSX from 'xlsx'

/*
 * Cell reading shared by the one-time spreadsheet migrations (exceptionSheet.ts,
 * dySheet.ts).
 *
 * Dates and times are read from the raw cell rather than its displayed text:
 * Excel stores a date as a day count and a time as a fraction of a day, the
 * displayed form depends on each cell's format, and SheetJS's Date conversion can
 * shift by the local timezone offset. Callers read workbooks without cellDates.
 */

export type Cell = XLSX.CellObject | undefined
export type Read = { value: string; error?: string }

export interface SheetRow<E> {
    /** 1-based row number as Excel shows it, for pointing back at the sheet. */
    sheetRow: number
    entry:    E
    /** IO rows can be skipped when the IO migration already brought them over. */
    isIo?:    boolean
    /** Anything here keeps the row out of the import. */
    problems: string[]
    /** Imported as-is, but worth a look. */
    warnings: string[]
}

export interface SheetParse<E> {
    headerErrors: string[]
    rows:         SheetRow<E>[]
}

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
export const pad2 = (n: number) => String(n).padStart(2, '0')

export const cellAt = (sheet: XLSX.WorkSheet, r: number, col: string): Cell =>
    sheet[XLSX.utils.encode_cell({ r, c: XLSX.utils.decode_col(col) })]

const textCell = (value: string): Cell => ({ t: 's', v: value })

export const textOf = (cell: Cell): Read => {
    if (!cell || cell.t === 'z' || cell.v === undefined || cell.v === null) return { value: '' }
    if (cell.t === 'e') return { value: '', error: `cell holds an Excel error (${cell.w ?? '#ERR'})` }
    if (cell.t === 'n') {
        // Prefer the displayed text so a zero-padded number format keeps its
        // zeros, unless Excel is showing it as 1.23E+11.
        const shown = cell.w?.trim()
        return { value: shown && !/e\+/i.test(shown) ? shown : String(cell.v) }
    }
    return { value: String(cell.v).trim() }
}

const isoDate = (y: number, m: number, d: number): string | null => {
    const t = new Date(Date.UTC(y, m - 1, d))
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
        ? `${y}-${pad2(m)}-${pad2(d)}`
        : null
}

// Excel day 0 is 1899-12-30 (its 1900 leap-year bug makes this the right epoch
// for every date after Feb 1900).
const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const fromSerial = (days: number) => new Date(EXCEL_EPOCH + days * 86_400_000).toISOString().slice(0, 10)
const hhmm = (minutes: number) => `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`
const dayFraction = (v: number) => Math.round((v - Math.floor(v)) * 1440) % 1440

const empty = (cell: Cell) => !cell || cell.t === 'z' || cell.v === undefined || cell.v === ''

export const readDate = (cell: Cell): Read => {
    if (empty(cell)) return { value: '' }
    if (cell!.t === 'n') {
        const v = cell!.v as number
        if (v < 1) return { value: '', error: `"${cell!.w ?? v}" is a time, not a date` }
        return { value: fromSerial(Math.floor(v)) }
    }
    const s = textOf(cell)
    if (s.error || s.value === '') return s

    let m = s.value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/)
    if (m) {
        const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
        const iso = isoDate(year, Number(m[1]), Number(m[2]))
        return iso ? { value: iso } : { value: '', error: `"${s.value}" is not a real date` }
    }
    m = s.value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) {
        const iso = isoDate(Number(m[1]), Number(m[2]), Number(m[3]))
        return iso ? { value: iso } : { value: '', error: `"${s.value}" is not a real date` }
    }
    return { value: '', error: `"${s.value}" is not a date` }
}

/** Military time as digits, e.g. 0730, 730, 0 — shorter strings pad on the left. */
const military = (digits: string, shown: string): Read => {
    const padded = digits.padStart(4, '0')
    const h = Number(padded.slice(0, 2)), m = Number(padded.slice(2))
    return h > 23 || m > 59
        ? { value: '', error: `"${shown}" is not a real time` }
        : { value: `${pad2(h)}:${pad2(m)}` }
}

export const readTime = (cell: Cell): Read => {
    if (empty(cell)) return { value: '' }
    if (cell!.t === 'n') {
        const v = cell!.v as number
        // A real Excel time is a fraction of a day. A whole number is military
        // time typed into a General cell (1009 = 10:09); read as a fraction it
        // would silently become 00:00.
        if (!Number.isInteger(v)) return { value: hhmm(dayFraction(v)) }
        if (v >= 0 && v <= 2359) return military(String(v), cell!.w ?? String(v))
        return { value: '', error: `"${cell!.w ?? v}" looks like a date, not a time` }
    }
    const s = textOf(cell)
    if (s.error || s.value === '') return s

    if (/^\d{1,4}$/.test(s.value)) return military(s.value, s.value)

    const m = s.value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(?:([ap])\.?\s*m?\.?)?$/i)
    if (!m) return { value: '', error: `"${s.value}" is not a time` }
    let h = Number(m[1])
    const min = Number(m[2])
    const ampm = m[3]?.toLowerCase()
    if (ampm) {
        if (h < 1 || h > 12) return { value: '', error: `"${s.value}" is not a real time` }
        h = (h % 12) + (ampm === 'p' ? 12 : 0)
    }
    if (h > 23 || min > 59) return { value: '', error: `"${s.value}" is not a real time` }
    return { value: `${pad2(h)}:${pad2(min)}` }
}

/** A date and time in one cell, e.g. 2026-09-24 6:00. */
export const readDateTime = (cell: Cell): { date: Read; time: Read } => {
    if (empty(cell)) return { date: { value: '' }, time: { value: '' } }
    if (cell!.t === 'n') {
        const v = cell!.v as number
        if (v < 1) return { date: { value: '', error: `"${cell!.w ?? v}" has no date` }, time: { value: hhmm(dayFraction(v)) } }
        return { date: { value: fromSerial(Math.floor(v)) }, time: { value: hhmm(dayFraction(v)) } }
    }
    const s = textOf(cell)
    if (s.error || s.value === '') return { date: s, time: { value: '' } }
    const [datePart, ...rest] = s.value.split(/\s+|T/)
    return { date: readDate(textCell(datePart)), time: readTime(textCell(rest.join(' '))) }
}

/** Row 2 headers, matched with case, spaces and punctuation stripped. */
export const checkHeaders = (sheet: XLSX.WorkSheet, headerRow: number, cols: { col: string; header: string }[]) =>
    cols
        .filter(c => !norm(textOf(cellAt(sheet, headerRow, c.col)).value).includes(c.header))
        .map(c => `Column ${c.col} should contain "${c.header}" but row ${headerRow + 1} has "${textOf(cellAt(sheet, headerRow, c.col)).value}"`)

/**
 * The app MERGEs a log entry on load # + dock + trailer. Every sheet row shares
 * one load #, so rows with the same dock and trailer would collapse into one
 * record, the later overwriting the rest — flag them all instead of choosing.
 */
export const flagCollisions = <E>(rows: SheetRow<E>[], keyOf: (e: E) => string | null) => {
    const byKey = new Map<string, SheetRow<E>[]>()
    for (const row of rows) {
        const key = keyOf(row.entry)
        if (key) byKey.set(key, [...(byKey.get(key) ?? []), row])
    }
    for (const group of byKey.values()) {
        if (group.length < 2) continue
        for (const row of group) {
            const others = group.filter(g => g !== row).map(g => g.sheetRow).join(', ')
            row.problems.push(`Same dock and trailer as row ${others}: these would overwrite each other`)
        }
    }
}
