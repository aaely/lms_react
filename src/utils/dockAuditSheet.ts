import { type TrailerRecord } from '../signals/signals'
import { boardDateShift } from './dateShift'

/*
 * The Dock Audit Sheet: the shift's schedule as the formatted workbook the docks
 * audit against — blue filtered header, pale green rows with green borders,
 * frozen through Dock Code. Built with exceljs (loaded on demand; the plain xlsx
 * package can't write fills, borders or frozen panes).
 */

const BLUE   = 'FF0070C0'
const BORDER = 'FF92D050'
const WHITE  = 'FFFFFFFF'
const FONT   = 'Aptos Narrow'

type Align = 'left' | 'center'

interface Column {
    header: string
    width:  number
    align?: Align
    value:  (t: TrailerRecord) => string | number
}

// 2026-11-05 → 11/5/2026; anything else is passed through as entered
const sheetDate = (d: string): string => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? '')
    return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : (d ?? '')
}

// 00:30 → 0:30
const sheetTime = (t: string): string => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t ?? '')
    return m ? `${Number(m[1])}:${m[2]}` : (t ?? '')
}

const COLUMNS: Column[] = [
    { header: 'Date/Shift',           width: 11, value: t => t.dateShift },
    { header: 'Hour',                 width: 5,  value: t => { const h = Number(t.hour); return `${t.hour ?? ''}` === '' || isNaN(h) ? '' : h } },
    { header: 'LMS/Accent',           width: 11, value: t => `${t.lmsAccent ?? ''}` },
    { header: 'Dock Code',            width: 6,  value: t => t.dockCode },
    { header: 'Dock Door',            width: 6,  value: t => t.door ?? '' },
    { header: 'Aca Type',             width: 8,  align: 'left', value: t => t.acaType },
    { header: 'Status',               width: 9,  align: 'left', value: t => t.status },
    { header: 'Route Id',             width: 15, align: 'left', value: t => t.routeId },
    { header: 'Scac',                 width: 7,  value: t => t.scac },
    { header: 'Trailer 1#',           width: 10, align: 'left', value: t => t.trailer1 },
    { header: 'Trailer 2#',           width: 10, align: 'left', value: t => t.trailer2 },
    { header: '1st Supplier',         width: 24, align: 'left', value: t => t.firstSupplier },
    { header: 'Dock Stop Sequence',   width: 9,  value: t => t.dockStopSequence },
    { header: 'Plan Start Date',      width: 11, value: t => sheetDate(t.planStartDate) },
    { header: 'Plan Start Time',      width: 6,  value: t => sheetTime(t.planStartTime) },
    { header: 'Schedule Start Date',  width: 11, value: t => sheetDate(t.scheduleStartDate) },
    { header: 'Adjusted Start Time',  width: 8,  value: t => sheetTime(t.adjustedStartTime) },
    { header: 'Schedule End Date',    width: 11, value: t => sheetDate(t.scheduleEndDate) },
    { header: 'Schedule End Time',    width: 8,  value: t => sheetTime(t.scheduleEndTime) },
    // The four the floor fills in by hand; whatever the record already has is carried
    { header: 'Plan\nStart\nTime',    width: 7,  value: () => '' },
    { header: 'Gate\nArrival\nTime',  width: 7,  value: t => sheetTime(t.gateArrivalTime) },
    { header: 'Actual\nStart\nTime',  width: 7,  value: t => sheetTime(t.actualStartTime) },
    { header: 'Actual\nEnd\nTime',    width: 7,  value: t => sheetTime(t.actualEndTime) },
    { header: 'Status O/X',           width: 8,  value: t => t.statusOX },
    { header: 'Ryder Comments',       width: 38, align: 'left', value: t => t.loadComments || t.ryderComments || '' },
    { header: 'GM  Comments',         width: 30, align: 'left', value: t => t.gmComments ?? '' },
]

// Columns kept in view while scrolling right: Date/Shift through Dock Code
const FROZEN_COLUMNS = 4

const startOf = (t: TrailerRecord): number => {
    const at = new Date(`${t.scheduleStartDate}T${t.adjustedStartTime}`).getTime()
    return isNaN(at) ? Infinity : at
}

/** "Dock Audit Sheet 11-15-2026-2nd", from the dateShift most of the rows carry. */
export const dockAuditFileName = (trailers: TrailerRecord[], suffix = ''): string => {
    const stamp = boardDateShift(trailers)
    const m = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/.exec(stamp ?? '')
    let name: string
    if (m) {
        name = `Dock Audit Sheet ${m[2]}-${m[3]}-${m[1]}-${m[4]}`
    } else {
        // Rows with no usable stamp: today's date, and whatever the stamp says
        const d = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        name = `Dock Audit Sheet ${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}${stamp ? `-${stamp}` : ''}`
    }
    return suffix ? `${name} ${suffix}` : name
}

/** Builds the workbook and hands it to the browser as a download. */
export const downloadDockAuditSheet = async (trailers: TrailerRecord[], suffix = ''): Promise<void> => {
    if (trailers.length === 0) return
    const ExcelJS = (await import('exceljs')).default

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Dock Audit', {
        views: [{ state: 'frozen', xSplit: FROZEN_COLUMNS, ySplit: 1 }],
    })
    ws.columns = COLUMNS.map(c => ({ width: c.width }))

    const header = ws.addRow(COLUMNS.map(c => c.header))
    header.height = 48
    header.eachCell(cell => {
        cell.font      = { name: FONT, size: 11, bold: true, color: { argb: WHITE } }
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }
        cell.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true }
    })

    const edge = { style: 'thin' as const, color: { argb: BORDER } }
    // By dock, then schedule start date and adjusted start time (startOf is both)
    const rows = [...trailers].sort((a, b) =>
        (a.dockCode || '').trim().localeCompare((b.dockCode || '').trim())
        || startOf(a) - startOf(b)
        || (a.routeId || '').localeCompare(b.routeId || ''))
    for (const t of rows) {
        const row = ws.addRow(COLUMNS.map(c => c.value(t)))
        // includeEmpty: blank cells are filled and bordered too
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col > COLUMNS.length) return
            cell.font      = { name: FONT, size: 11 }
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: WHITE } }
            cell.border    = { top: edge, bottom: edge, left: edge, right: edge }
            cell.alignment = { horizontal: COLUMNS[col - 1].align ?? 'center', vertical: 'middle' }
        })
    }

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } }

    const buffer = await wb.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${dockAuditFileName(trailers, suffix)}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
}