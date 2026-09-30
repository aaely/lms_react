import { useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import * as XLSX from 'xlsx'
import { user } from '../signals/signals'
import { api } from '../utils/api'
import type { SheetParse, SheetRow } from '../utils/sheetCells'
import Circles from './Loader'

/*
 * Shared page for moving a log spreadsheet into the app, re-run daily until the
 * sheet is retired and its entries have washed out (ExceptionMigration.tsx,
 * DyMigration.tsx). The sheet-specific parts — parsing, endpoint, load # — come
 * in as props. Each import replaces every entry under the sheet's load # in one
 * transaction server-side (mgo_backend src/io_migration.rs).
 */

export interface SheetMigrationProps<E> {
    /** e.g. "Exception Log" */
    logName:     string
    /** Every row is filed under this load #; each import replaces all entries under it. */
    loadNum:     string
    parse:       (sheet: XLSX.WorkSheet) => SheetParse<E>
    /** Lists the log's current entries — only used to count the ones about to be replaced. */
    existingUrl: string
    importUrl:   string
    /** Short identifier for problem lists, e.g. "BE / 40798". */
    describe:    (e: E) => string
    preview:     { label: string; value: (e: E) => string }[]
    /** Sheet-specific notes shown under the heading. */
    notes?:      React.ReactNode
}

const errorText = (e: any): string =>
    typeof e?.response?.data === 'string' && e.response.data ? e.response.data : (e?.message ?? 'Request failed')

const th: React.CSSProperties = { padding: '6px 8px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'white' }
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }

const SheetMigration = <E,>({ logName, loadNum, parse, existingUrl, importUrl, describe, preview, notes }: SheetMigrationProps<E>) => {
    const [u] = useAtom(user)
    const [loading, setLoading] = useState(false)

    const [workbook, setWorkbook]   = useState<XLSX.WorkBook | null>(null)
    const [fileName, setFileName]   = useState('')
    const [sheetName, setSheetName] = useState('')
    const [skipIo, setSkipIo]       = useState(false)
    const [imported, setImported]   = useState<{ deleted: number; imported: number } | null>(null)
    const [error, setError]         = useState('')

    const host = window.location.host

    const parsed = useMemo(
        () => workbook && sheetName ? parse(workbook.Sheets[sheetName]) : null,
        [workbook, sheetName, parse],
    )

    const rows      = parsed?.rows ?? []
    const blocked   = rows.filter(r => r.problems.length > 0)
    const ioRows    = rows.filter(r => r.isIo && r.problems.length === 0)
    const ready     = rows.filter(r => r.problems.length === 0 && !(skipIo && r.isIo))
    const withNotes = ready.filter(r => r.warnings.length > 0)

    if (u.role !== 'admin') {
        return <p style={{ margin: '5%' }}>{logName} migration is admin only.</p>
    }

    const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setImported(null)
        setError('')
        const reader = new FileReader()
        reader.onload = e => {
            try {
                // No cellDates: dates and times stay as Excel's raw day numbers,
                // which sheetCells converts without a timezone shift.
                const wb = XLSX.read(e.target?.result, { type: 'array' })
                setWorkbook(wb)
                setFileName(file.name)
                setSheetName(wb.SheetNames[0] ?? '')
            } catch (err: any) {
                setError(`Couldn't read ${file.name}: ${err?.message ?? err}`)
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const runImport = async () => {
        const skipped = rows.length - ready.length

        // Only for the confirm message — the delete itself happens server-side.
        let existing = 'all'
        try {
            const res = await api.get<{ loadNum: string }[]>(existingUrl)
            existing = String(res.data.filter(e => e.loadNum === loadNum).length)
        } catch { /* confirm without the number */ }

        if (!window.confirm(
            `Replace the ${logName} sheet entries in ${host}?\n\n` +
            `Deletes ${existing} existing entries with load # "${loadNum}" (including any edits made ` +
            `to them in the app), then imports ${ready.length} from the sheet.` +
            (skipped > 0 ? `\n\n${skipped} sheet row(s) will be left out (listed on the page).` : '') +
            `\n\nEntries with any other load # are not touched. If the import fails, nothing changes.`
        )) return

        setLoading(true)
        setError('')
        try {
            const res = await api.post(importUrl, ready.map(r => r.entry))
            setImported(res.data)
        } catch (e) {
            setError(errorText(e))
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Circles />

    const rowList = (list: SheetRow<E>[], key: 'problems' | 'warnings', color: string) => (
        <ul style={{ color, maxHeight: 220, overflow: 'auto' }}>
            {list.map(r => (
                <li key={r.sheetRow}>Row {r.sheetRow} ({describe(r.entry)}): {r[key].join('; ')}</li>
            ))}
        </ul>
    )

    const inputId = `sheet-${loadNum}`

    return (
        <div style={{ margin: '3% auto', width: '85vw' }}>
            <h3>{logName} Migration</h3>
            <p style={{ color: '#888' }}>
                This environment: <strong>{host}</strong>. Row 1 of the sheet is skipped, row 2 must be
                the headers. Every entry gets load # <code>{loadNum}</code>.
            </p>
            <p style={{ color: '#888' }}>
                Each import <strong>replaces</strong> all load # <code>{loadNum}</code> entries with the
                sheet's current rows, so it can be re-run daily until the sheet is retired. Edits made in
                the app to those entries are overwritten; entries with any other load # are left alone.
            </p>
            {notes}

            <input id={inputId} type="file" accept=".xlsx, .xls" onChange={loadFile} style={{ display: 'none' }} />
            <label htmlFor={inputId} className="btn btn-primary">Choose {logName} .xlsx</label>
            {fileName && <span style={{ marginLeft: 12 }}>{fileName}</span>}

            {workbook && workbook.SheetNames.length > 1 && (
                <label style={{ marginLeft: 16 }}>
                    Sheet{' '}
                    <select value={sheetName} onChange={e => setSheetName(e.target.value)}>
                        {workbook.SheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </label>
            )}

            {error && <p style={{ color: 'red', marginTop: '2%' }}>{error}</p>}

            {parsed && parsed.headerErrors.length > 0 && (
                <div style={{ color: 'red', marginTop: '2%' }}>
                    <p>This sheet's layout doesn't match the {logName}, so nothing can be imported:</p>
                    <ul>{parsed.headerErrors.map(h => <li key={h}>{h}</li>)}</ul>
                </div>
            )}

            {parsed && parsed.headerErrors.length === 0 && (
                <>
                    <p style={{ marginTop: '2%' }}>
                        {rows.length} entries found: <strong style={{ color: 'green' }}>{ready.length} ready</strong>
                        {blocked.length > 0 && <>, <strong style={{ color: 'red' }}>{blocked.length} with problems</strong></>}
                        {skipIo && ioRows.length > 0 && <>, {ioRows.length} IO rows skipped</>}.
                    </p>

                    {blocked.length > 0 && (
                        <>
                            <h5>Left out: fix these in the sheet and import again</h5>
                            {rowList(blocked, 'problems', 'red')}
                        </>
                    )}

                    {ioRows.length > 0 && (
                        <label style={{ display: 'block', margin: '1% 0' }}>
                            <input type="checkbox" checked={skipIo} onChange={e => setSkipIo(e.target.checked)} />{' '}
                            Skip the {ioRows.length} IO row(s). Tick this if the IO migration already brought
                            these trailers over; otherwise each would show twice on the schedule builder.
                        </label>
                    )}

                    {withNotes.length > 0 && (
                        <>
                            <h5>Imported, but worth a look</h5>
                            {rowList(withNotes, 'warnings', '#d97706')}
                        </>
                    )}

                    {ready.length > 0 && (
                        <div style={{ maxHeight: '45vh', overflow: 'auto', marginTop: '1%' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th style={th}>Row</th>
                                        {preview.map(p => <th key={p.label} style={th}>{p.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ready.map(({ sheetRow, entry }) => (
                                        <tr key={sheetRow}>
                                            <td style={td}>{sheetRow}</td>
                                            {preview.map(p => <td key={p.label} style={td}>{p.value(entry)}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button onClick={runImport} className="btn btn-danger" style={{ marginTop: '2%' }} disabled={ready.length === 0}>
                        Replace sheet entries in {host} ({ready.length})
                    </button>
                </>
            )}

            {imported !== null && (
                <p style={{ color: 'green', marginTop: '2%' }}>
                    Replaced {imported.deleted} old sheet entr{imported.deleted === 1 ? 'y' : 'ies'} with{' '}
                    {imported.imported} from the sheet successfully.
                </p>
            )}
        </div>
    )
}

export default SheetMigration
