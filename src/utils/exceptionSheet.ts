import * as XLSX from 'xlsx'
import { cellAt, checkHeaders, flagCollisions, norm, readDate, readTime, textOf, type SheetParse, type SheetRow } from './sheetCells'

/*
 * The Exception Log spreadsheet -> ExceptionLogEntry rows, for the one-time move
 * into the app (pages/ExceptionMigration.tsx).
 *
 * Row 1 holds fill-in instructions, row 2 the headers, entries start on row 3.
 * Columns are read by position. C (Dock Door) has no field on an entry, and P/Q
 * (plan end date/time) are marked LEAVE BLANK on the sheet and unused.
 */

/** Marks an entry as the sheet's: every run replaces all entries under it. */
export const EXCEPTION_SHEET_LOAD_NUM = 'Exception'

export interface ExceptionEntry {
    loadNum:        string
    dock:           string
    type:           string
    status:         string
    route:          string
    scac:           string
    trailer1:       string
    trailer2:       string
    supplier:       string
    dockSequence:   string
    originalDate:   string
    originalTime:   string
    newDate:        string
    newTime:        string
    newEndDate:     string
    newEndTime:     string
    comment:        string
    requestor:      string
    isRepower:      boolean
    repowerLoadNum: string
}

type Kind = 'text' | 'date' | 'time'
type TextField = Exclude<keyof ExceptionEntry, 'isRepower'>

// `header` is matched against row 2 with case, spaces and punctuation stripped,
// so "Trailer #1" -> "trailer1".
const COLUMNS: { col: string; field: TextField; header: string; kind: Kind }[] = [
    { col: 'A', field: 'requestor',    header: 'requestor',         kind: 'text' },
    { col: 'B', field: 'dock',         header: 'dockcode',          kind: 'text' },
    { col: 'D', field: 'type',         header: 'acatype',           kind: 'text' },
    { col: 'E', field: 'status',       header: 'status',            kind: 'text' },
    { col: 'F', field: 'route',        header: 'routeid',           kind: 'text' },
    { col: 'G', field: 'scac',         header: 'scac',              kind: 'text' },
    { col: 'H', field: 'trailer1',     header: 'trailer1',          kind: 'text' },
    { col: 'I', field: 'trailer2',     header: 'trailer2',          kind: 'text' },
    { col: 'J', field: 'supplier',     header: '1stsupplier',       kind: 'text' },
    { col: 'K', field: 'dockSequence', header: 'dockstopsequence',  kind: 'text' },
    { col: 'L', field: 'originalDate', header: 'planstartdate',     kind: 'date' },
    { col: 'M', field: 'originalTime', header: 'planstarttime',     kind: 'time' },
    { col: 'N', field: 'newDate',      header: 'schedulestartdate', kind: 'date' },
    { col: 'O', field: 'newTime',      header: 'adjustedstarttime', kind: 'time' },
    { col: 'R', field: 'newEndDate',   header: 'scheduleenddate',   kind: 'date' },
    { col: 'S', field: 'newEndTime',   header: 'scheduleendtime',   kind: 'time' },
    { col: 'T', field: 'comment',      header: 'comment',           kind: 'text' },
]

// The Exception Log form's dropdown options (pages/ExceptionLog.tsx). The sheet
// writes them in capitals; an unmatched value shows blank when edited in the app.
const TYPES    = ['IO Container', 'IO Offload Drop', 'IO Drop', 'IO Direct', 'Expedite', 'Deviation']
const STATUSES = ['Active', 'Expedite']

const HEADER_ROW = 1   // 0-based: row 2
const FIRST_ROW  = 2   // 0-based: row 3

const canonical = (value: string, options: string[]) => options.find(o => norm(o) === norm(value))

// An ACA Type or Status with IO in it marks an IO entry, which the IO migration
// owns. Matched as a word: as a plain substring it would catch "DEVIATION".
const IO_WORD = /\bIO\b/i

const ioReason = (e: ExceptionEntry): string | undefined => {
    if (IO_WORD.test(e.type))   return `ACA Type "${e.type}"`
    if (IO_WORD.test(e.status)) return `Status "${e.status}"`
    return undefined
}

export const parseExceptionSheet = (sheet: XLSX.WorkSheet): SheetParse<ExceptionEntry> => {
    const headerErrors = checkHeaders(sheet, HEADER_ROW, COLUMNS)
    const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null
    const rows: SheetRow<ExceptionEntry>[] = []
    if (headerErrors.length > 0 || !range) return { headerErrors, rows }

    for (let r = FIRST_ROW; r <= range.e.r; r++) {
        const entry: ExceptionEntry = {
            loadNum: EXCEPTION_SHEET_LOAD_NUM, dock: '', type: '', status: '', route: '', scac: '',
            trailer1: '', trailer2: '', supplier: '', dockSequence: '', originalDate: '', originalTime: '',
            newDate: '', newTime: '', newEndDate: '', newEndTime: '', comment: '', requestor: '',
            isRepower: false, repowerLoadNum: '',
        }
        const problems: string[] = []
        const warnings: string[] = []

        for (const c of COLUMNS) {
            const cell = cellAt(sheet, r, c.col)
            const read = c.kind === 'date' ? readDate(cell) : c.kind === 'time' ? readTime(cell) : textOf(cell)
            entry[c.field] = read.value
            if (read.error) problems.push(`${c.col} (${c.field}): ${read.error}`)
        }

        // Blank lines between or after entries
        if (!COLUMNS.some(c => entry[c.field] !== '') && problems.length === 0) continue

        if (!entry.trailer1) problems.push('No Trailer #1: the app identifies an exception by load #, dock and trailer')
        if (!entry.dock)     problems.push('No Dock Code')

        const type = canonical(entry.type, TYPES)
        if (type) entry.type = type
        else if (entry.type) warnings.push(`ACA Type "${entry.type}" isn't an Exception Log option; it will show blank when edited`)

        const status = canonical(entry.status, STATUSES)
        if (status) entry.status = status
        else if (entry.status) warnings.push(`Status "${entry.status}" isn't an Exception Log option; it will show blank when edited`)

        if (!entry.newDate || !entry.newTime) {
            warnings.push('No Schedule Start Date/Adjusted Start Time: it won\'t land on any shift')
        }

        rows.push({ sheetRow: r + 1, entry, ioReason: ioReason(entry), problems, warnings })
    }

    // IO rows are left out, so they can't block a real entry on the same trailer.
    flagCollisions(rows.filter(r => !r.ioReason), e => e.trailer1 && e.dock ? `${e.dock}|${e.trailer1}` : null)
    return { headerErrors, rows }
}
