import { useState } from 'react'
import { useAtom } from 'jotai'
import Papa from 'papaparse'
import { user } from '../signals/signals'
import { api } from '../utils/api'
import Circles from './Loader'

/*
 * One-time move of IO scheduling data between environments — export CSVs here in
 * test, import them on the same page in prod. Backed by /api/export_io and
 * /api/import_io (mgo_backend src/io_migration.rs); delete both once done.
 *
 * Column names are the JSON field names, so a file round-trips without a mapping.
 */

const LINE_COLS = [
    'trailer', 'sid', 'has_cisco_id', 'cisco_id', 'part', 'quantity', 'duns', 'on_sid', 'on_trailer',
    'destination', 'supplier', 'location', 'ship_date', 'original_date', 'schedule_date',
    'schedule_time', 'comments', 'status', 'scac', 'carrier_email',
] as const

const HISTORY_COLS = [
    'trailer_id', 'event_date', 'destination', 'supplier', 'location', 'ship_date', 'original_date',
    'schedule_date', 'schedule_time', 'comments', 'status', 'scheduled_status', 'scac',
    'carrier_email', 'parts', 'sids', 'recorded_by', 'recorded_at',
] as const

const EXCEPTION_COLS = [
    'loadNum', 'dock', 'type', 'status', 'route', 'scac', 'trailer1', 'trailer2', 'supplier',
    'dockSequence', 'originalDate', 'originalTime', 'newDate', 'newTime', 'newEndDate',
    'newEndTime', 'comment', 'requestor', 'isRepower', 'repowerLoadNum',
] as const

type Row = Record<string, string | number | boolean | string[]>

interface IoData {
    active:     Row[]
    delivered:  Row[]
    no_shows:   Row[]
    exceptions: Row[]
}

type DatasetKey = keyof IoData

const DATASETS: { key: DatasetKey; file: string; label: string; cols: readonly string[] }[] = [
    { key: 'active',     file: 'io_active.csv',     label: 'Active IO trailers (one row per SID/part)', cols: LINE_COLS },
    { key: 'delivered',  file: 'io_delivered.csv',  label: 'Delivered history',                        cols: HISTORY_COLS },
    { key: 'no_shows',   file: 'io_no_shows.csv',   label: 'No-show history',                          cols: HISTORY_COLS },
    { key: 'exceptions', file: 'io_exceptions.csv', label: 'IO Exception Log entries',                 cols: EXCEPTION_COLS },
]

const BOOL_COLS  = new Set(['has_cisco_id', 'on_sid', 'on_trailer', 'isRepower'])
const LIST_COLS  = new Set(['parts', 'sids'])
const INT_COLS   = new Set(['quantity'])
// Neither SIDs nor part numbers contain it — update_io already keys sid|part on it.
const LIST_SEP   = '|'

const toCell = (v: Row[string] | undefined): string =>
    Array.isArray(v) ? v.join(LIST_SEP) : v === undefined || v === null ? '' : String(v)

const fromCell = (col: string, v: string | undefined): Row[string] => {
    const s = v ?? ''
    if (BOOL_COLS.has(col)) return s.trim().toLowerCase() === 'true'
    if (LIST_COLS.has(col)) return s ? s.split(LIST_SEP).filter(Boolean) : []
    if (INT_COLS.has(col))  return s.trim() === '' ? 0 : Number(s)
    // Strings pass through untouched: trimming would change a MERGE key.
    return s
}

const downloadCsv = (file: string, cols: readonly string[], rows: Row[]) => {
    const csv  = Papa.unparse({ fields: [...cols], data: rows.map(r => cols.map(c => toCell(r[c]))) })
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = file
    link.click()
    URL.revokeObjectURL(url)
}

const distinctTrailers = (active: Row[]) => new Set(active.map(r => r.trailer)).size

const errorText = (e: any): string =>
    typeof e?.response?.data === 'string' && e.response.data ? e.response.data : (e?.message ?? 'Request failed')

const IoMigration = () => {
    const [u] = useAtom(user)
    const [loading, setLoading] = useState(false)

    const [exported, setExported]       = useState<IoData | null>(null)
    const [exportError, setExportError] = useState('')

    const [staged, setStaged]           = useState<Partial<IoData>>({})
    const [fileErrors, setFileErrors]   = useState<Partial<Record<DatasetKey, string>>>({})
    const [imported, setImported]       = useState<Record<string, number> | null>(null)
    const [importError, setImportError] = useState('')

    const host = window.location.host

    if (u.role !== 'admin') {
        return <p style={{ margin: '5%' }}>IO migration is admin only.</p>
    }

    const runExport = async () => {
        setLoading(true)
        setExportError('')
        try {
            const res = await api.get<IoData>('/api/export_io')
            setExported(res.data)
        } catch (e) {
            setExportError(errorText(e))
        } finally {
            setLoading(false)
        }
    }

    const stageFile = (key: DatasetKey, cols: readonly string[]) =>
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setImported(null)
            setImportError('')

            Papa.parse<Record<string, string>>(file, {
                header: true,
                skipEmptyLines: true,
                // Types are applied per column below. Papa's own typing would turn
                // a DUNS or part number like 00123 into 123 — a different node.
                dynamicTyping: false,
                transformHeader: h => h.replace(/^﻿/, '').trim(),
                complete: results => {
                    const fields = results.meta.fields ?? []
                    const missing = cols.filter(c => !fields.includes(c))
                    if (missing.length > 0) {
                        setFileErrors(prev => ({ ...prev, [key]: `Wrong file for this slot, or columns were edited. Missing: ${missing.join(', ')}` }))
                        setStaged(prev => ({ ...prev, [key]: undefined }))
                        return
                    }
                    const rows = results.data.map(raw =>
                        Object.fromEntries(cols.map(c => [c, fromCell(c, raw[c])])) as Row)
                    setFileErrors(prev => ({ ...prev, [key]: undefined }))
                    setStaged(prev => ({ ...prev, [key]: rows }))
                },
                error: err => setFileErrors(prev => ({ ...prev, [key]: err.message })),
            })
        }

    const runImport = async () => {
        const data: IoData = {
            active:     staged.active     ?? [],
            delivered:  staged.delivered  ?? [],
            no_shows:   staged.no_shows   ?? [],
            exceptions: staged.exceptions ?? [],
        }
        const summary =
            `${distinctTrailers(data.active)} trailers (${data.active.length} rows), ` +
            `${data.delivered.length} delivered, ${data.no_shows.length} no-shows, ` +
            `${data.exceptions.length} exception entries`
        if (!window.confirm(`Import into ${host}?\n\n${summary}\n\nExisting IO schedules for the same trailers will be overwritten. Nothing is deleted.`)) {
            return
        }

        setLoading(true)
        setImportError('')
        setImported(null)
        try {
            const res = await api.post('/api/import_io', data)
            setImported(res.data)
            setStaged({})
        } catch (e) {
            setImportError(errorText(e))
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Circles />

    const hasStaged = DATASETS.some(d => staged[d.key] !== undefined)
    const hasErrors = Object.values(fileErrors).some(Boolean)

    return (
        <div style={{ margin: '3% auto', width: '70vw' }}>
            <h3>IO Migration</h3>
            <p style={{ color: '#888' }}>
                This environment: <strong>{host}</strong>
            </p>

            {/* ── Export ── */}
            <h4 style={{ marginTop: '4%' }}>1. Export from this environment</h4>
            <button onClick={runExport} className="btn btn-primary">Read IO data</button>
            {exportError && <p style={{ color: 'red', marginTop: '2%' }}>{exportError}</p>}
            {exported && (
                <div style={{ marginTop: '2%' }}>
                    <p style={{ color: 'green' }}>
                        {distinctTrailers(exported.active)} active trailers ({exported.active.length} rows),{' '}
                        {exported.delivered.length} delivered, {exported.no_shows.length} no-shows,{' '}
                        {exported.exceptions.length} IO exception entries. Keep these numbers to check the import.
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {DATASETS.map(d => (
                            <button key={d.key} className="btn btn-secondary"
                                onClick={() => downloadCsv(d.file, d.cols, exported[d.key])}>
                                {d.file} ({exported[d.key].length})
                            </button>
                        ))}
                    </div>
                    <p style={{ color: '#d97706', marginTop: '2%' }}>
                        Don't open and re-save these in Excel. It drops leading zeros from DUNS and part
                        numbers and rewrites long SIDs as 1.23E+11, which would import as different records.
                    </p>
                </div>
            )}

            {/* ── Import ── */}
            <h4 style={{ marginTop: '6%' }}>2. Import into this environment</h4>
            {DATASETS.map(d => (
                <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '1%' }}>
                    <input id={`io-${d.key}`} type="file" accept=".csv" onChange={stageFile(d.key, d.cols)} style={{ display: 'none' }} />
                    <label htmlFor={`io-${d.key}`} className="btn btn-outline-secondary" style={{ minWidth: 190, marginBottom: 0 }}>
                        {d.file}
                    </label>
                    <span style={{ color: '#888' }}>{d.label}</span>
                    {staged[d.key] !== undefined && (
                        <span style={{ color: 'green' }}>{staged[d.key]!.length} rows</span>
                    )}
                    {fileErrors[d.key] && <span style={{ color: 'red' }}>{fileErrors[d.key]}</span>}
                </div>
            ))}

            <button onClick={runImport} className="btn btn-danger" style={{ marginTop: '3%' }}
                disabled={!hasStaged || hasErrors}>
                Import into {host}
            </button>
            {importError && <p style={{ color: 'red', marginTop: '2%' }}>{importError}</p>}
            {imported && (
                <p style={{ color: 'green', marginTop: '2%' }}>
                    Imported {imported.trailers} trailers ({imported.lines} SID/part lines),{' '}
                    {imported.delivered} delivered, {imported.no_shows} no-shows,{' '}
                    {imported.exceptions} exception entries. Run step 1 here to compare against the source.
                </p>
            )}
        </div>
    )
}

export default IoMigration
