import * as XLSX from 'xlsx'
import { cellAt, checkHeaders, pad2, readDate, readDateTime, readTime, textOf, type SheetParse, type SheetRow } from './sheetCells'

/*
 * The DropYard Communication Log spreadsheet -> DyCommLogEntry rows, for the move
 * into the app (pages/DyMigration.tsx).
 *
 * Row 1 is a banner, row 2 the headers, entries start on row 3. Columns A-J are
 * read by position; K-O (Part #, PDT, DY contact, confirmation time, audit sheet)
 * are ignored. G and H's headers are long instructions, so only H is checked,
 * loosely; G's values are checked as dock codes instead.
 */

/** Marks an entry as the sheet's: every run replaces all entries under it. */
export const DY_SHEET_LOAD_NUM = 'DropYard'

export interface DyEntry {
    loadNum:      string
    trailer:      string
    scac:         string
    route:        string
    dock:         string
    location:     string
    deliveryDate: string
    deliveryTime: string
    supplier:     string
    part:         string
    pdt:          string
    createdBy:    string
    /** When it was logged (A + B), as UTC 'YYYY-MM-DD HH:MM' like the app stamps it. */
    createdAt:    string
}

// The DY Comm Log form's docks (pages/DyCommLog.tsx); it rejects anything else.
const DOCKS = ['A', 'BE', 'BN', 'BW', 'F', 'E', 'F1', 'P', 'D', 'U', 'V']

const HEADERS = [
    { col: 'A', header: 'date' },
    { col: 'B', header: 'time' },
    { col: 'C', header: 'requestor' },
    { col: 'D', header: 'trailer' },
    { col: 'E', header: 'scac' },
    { col: 'F', header: 'route' },
    { col: 'H', header: 'dy' },
    { col: 'I', header: 'date' },
    { col: 'J', header: 'supplier' },
]

const HEADER_ROW = 1   // 0-based: row 2
const FIRST_ROW  = 2   // 0-based: row 3

/**
 * The sheet's log time is plant-local; the app stamps createdAt in UTC. Read in
 * the browser's zone, so run the import from a machine set to the plant's time.
 */
const localToUtc = (date: string, time: string): string => {
    const [y, m, d] = date.split('-').map(Number)
    const [h, min] = (time || '00:00').split(':').map(Number)
    const t = new Date(y, m - 1, d, h, min)
    return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())} ${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`
}

export const parseDySheet = (sheet: XLSX.WorkSheet): SheetParse<DyEntry> => {
    const headerErrors = checkHeaders(sheet, HEADER_ROW, HEADERS)
    const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null
    const rows: SheetRow<DyEntry>[] = []
    if (headerErrors.length > 0 || !range) return { headerErrors, rows }

    for (let r = FIRST_ROW; r <= range.e.r; r++) {
        const problems: string[] = []
        const warnings: string[] = []
        const note = (col: string, field: string, read: { value: string; error?: string }) => {
            if (read.error) problems.push(`${col} (${field}): ${read.error}`)
            return read.value
        }

        const loggedDate = note('A', 'date', readDate(cellAt(sheet, r, 'A')))
        const loggedTime = note('B', 'time', readTime(cellAt(sheet, r, 'B')))
        const delivery   = readDateTime(cellAt(sheet, r, 'I'))

        const entry: DyEntry = {
            loadNum:      DY_SHEET_LOAD_NUM,
            createdBy:    note('C', 'requestor', textOf(cellAt(sheet, r, 'C'))),
            trailer:      note('D', 'trailer',   textOf(cellAt(sheet, r, 'D'))),
            // The DY form uppercases dock and route as they're typed; SCAC codes are
            // uppercase everywhere else. The DOH lookup on the schedule builder is
            // case-sensitive, so a lowercase route there would find nothing.
            scac:         note('E', 'scac',      textOf(cellAt(sheet, r, 'E'))).toUpperCase(),
            route:        note('F', 'route',     textOf(cellAt(sheet, r, 'F'))).toUpperCase(),
            dock:         note('G', 'dock',      textOf(cellAt(sheet, r, 'G'))).toUpperCase(),
            location:     note('H', 'location',  textOf(cellAt(sheet, r, 'H'))),
            deliveryDate: note('I', 'delivery date', delivery.date),
            deliveryTime: note('I', 'delivery time', delivery.time),
            supplier:     note('J', 'supplier',  textOf(cellAt(sheet, r, 'J'))),
            part:         '',
            pdt:          '',
            createdAt:    '',
        }

        // Blank lines between or after entries
        const fields = [loggedDate, loggedTime, entry.createdBy, entry.trailer, entry.scac, entry.route,
                        entry.dock, entry.location, entry.deliveryDate, entry.supplier]
        if (!fields.some(Boolean) && problems.length === 0) continue

        if (!entry.trailer) problems.push('No Trailer #: the app identifies a DY entry by load #, dock and trailer')
        if (!entry.dock)    problems.push('No dock (column G)')
        else if (!DOCKS.includes(entry.dock)) {
            warnings.push(`Dock "${entry.dock}" isn't a DY Log dock; the edit form won't accept it`)
        }
        if (!entry.deliveryDate || !entry.deliveryTime) {
            warnings.push('No delivery date and time in column I: it won\'t land on any shift')
        }

        if (loggedDate) entry.createdAt = localToUtc(loggedDate, loggedTime)

        rows.push({ sheetRow: r + 1, entry, problems, warnings })
    }

    // The same trailer can appear more than once (different shifts); the import
    // writes one entry per row, so these are kept rather than merged.
    return { headerErrors, rows }
}
