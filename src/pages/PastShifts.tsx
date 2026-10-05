import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { type TrailerRecord } from '../signals/signals'
import { api } from '../utils/api'
import { getBackground, filterTrailersByDock, isPlantDockView } from '../utils/helpers'
import { TextField, MenuItem } from '@mui/material'

const SHIFTS = ['1st', '2nd', '3rd']
// The per-dock button row on this page also offers the offsite yards.
const DOCK_BUTTONS = ['A', 'BE', 'BN', 'BW', 'D', 'E', 'F', 'F1', 'P', 'V', 'U']

const th = { padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' } as const
const td = { border: '1px solid #eee' } as const

// statusOX codes counted in the shift summary, in display order. 'C' is stamped by
// the shift roll on trailers it brings into the next shift, so here it means the
// trailer was carried *in* to this one.
const SUMMARY_CODES: [string, string][] = [
    ['O', 'On Time'],
    ['E', 'Early'],
    ['L', 'Late'],
    ['N', 'No Show'],
    ['C', 'Carried In'],
    ['R', 'Reschedule'],
]

// Carried over to the next shift: arrived but never emptied, and not rescheduled —
// the same trailers roll_next_shift keeps. Those with no end time that never
// arrived (archived as No Show) or were rescheduled are dropped by the roll, not
// carried, and already have their own boxes.
const carriedOver = (t: TrailerRecord) =>
    !t.actualEndTime?.trim() && !!t.gateArrivalTime?.trim() && (t.statusOX || '').trim().toUpperCase() !== 'R'

const bySchedule = (a: TrailerRecord, b: TrailerRecord) =>
    new Date(`${a.scheduleStartDate} ${a.adjustedStartTime}`).getTime() -
    new Date(`${b.scheduleStartDate} ${b.adjustedStartTime}`).getTime()

// Every field on the archived record, named for what it is (the table on screen
// labels the schedule start columns "Plan Start"), plus the summary's two
// derived categories.
const CSV_COLUMNS: [string, (t: TrailerRecord) => unknown][] = [
    ['Date/Shift',          t => t.dateShift],
    ['Hour',                t => t.hour],
    ['Load #',              t => t.lmsAccent],
    ['Dock Code',           t => t.dockCode],
    ['ACA Type',            t => t.acaType],
    ['Status',              t => t.status],
    ['Route ID',            t => t.routeId],
    ['SCAC',                t => t.scac],
    ['DOH',                 t => t.lowestDoh],
    ['Trailer 1',           t => t.trailer1],
    ['Trailer 2',           t => t.trailer2],
    ['Door',                t => t.door],
    ['1st Supplier',        t => t.firstSupplier],
    ['Dock Stop Seq',       t => t.dockStopSequence],
    ['Plan Start Date',     t => t.planStartDate],
    ['Plan Start Time',     t => t.planStartTime],
    ['Schedule Start Date', t => t.scheduleStartDate],
    ['Schedule Start Time', t => t.adjustedStartTime],
    ['Schedule End Date',   t => t.scheduleEndDate],
    ['Schedule End Time',   t => t.scheduleEndTime],
    ['Gate Arrival Date',   t => t.gateArrivalDate],
    ['Gate Arrival Time',   t => t.gateArrivalTime],
    ['Door Arrival Date',   t => t.doorArrivalDate],
    ['Door Arrival Time',   t => t.doorArrivalTime],
    ['Dock Start Date',     t => t.actualStartDate],
    ['Dock Start Time',     t => t.actualStartTime],
    ['Dock End Date',       t => t.actualEndDate],
    ['Dock End Time',       t => t.actualEndTime],
    ['Status OX',           t => t.statusOX],
    ['Stat',                t => t.stat],
    ['Carried In',          t => (t.statusOX || '').trim().toUpperCase() === 'C' ? 'Yes' : 'No'],
    ['Carried Over',        t => carriedOver(t) ? 'Yes' : 'No'],
    ['Load Comments',       t => t.loadComments],
    ['Ryder Comments',      t => t.ryderComments],
    ['GM Comments',         t => t.gmComments],
    ['Dock Comments',       t => t.dockComments],
]

const downloadCsv = (fileName: string, rows: TrailerRecord[]) => {
    const csv = Papa.unparse({
        fields: CSV_COLUMNS.map(([name]) => name),
        data: rows.map(t => CSV_COLUMNS.map(([, get]) => get(t) ?? '')),
    })
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
}

const PastShifts = () => {
    const [trailers, setTrailers] = useState<TrailerRecord[]>([])
    const [filtered, setFiltered] = useState<TrailerRecord[]>([])
    const [opDate, setOpDate] = useState<string>(new Date(Date.now()).toLocaleDateString('en-CA'))
    const [shift, setShift] = useState<string>('1st')
    const [currentDock, setCurrentDock] = useState<string>('All')
    const [loading, setLoading] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [dayLoading, setDayLoading] = useState(false)
    const [downloadError, setDownloadError] = useState('')

    // The whole shift, whatever dock is selected
    const downloadShift = () => {
        setDownloadError('')
        downloadCsv(`past_shift_${opDate}_${shift}.csv`, trailers)
    }

    // All three shifts of the selected date in one file. All-or-nothing: a file
    // quietly missing a shift would read as a quiet shift.
    const downloadDay = async () => {
        setDownloadError('')
        setDayLoading(true)
        try {
            const results = await Promise.all(SHIFTS.map(s =>
                api.get<TrailerRecord[]>(`/api/get_past_shift/${opDate}-${s}`)))
            const rows = results.flatMap(res => [...res.data].sort(bySchedule))
            if (rows.length === 0) {
                setDownloadError(`No records for ${opDate}.`)
                return
            }
            downloadCsv(`past_shifts_${opDate}.csv`, rows)
        } catch (err) {
            console.error(err)
            setDownloadError(`Couldn't load every shift for ${opDate}, so nothing was downloaded. Try again.`)
        } finally {
            setDayLoading(false)
        }
    }

    useEffect(() => {
        if (!opDate || !shift) return
        const operationalDate = `${opDate}-${shift}`
        setLoading(true)
        ;(async () => {
            try {
                console.log('Fetching past shift data for', operationalDate)
                const res = await api.get<TrailerRecord[]>(`/api/get_past_shift/${operationalDate}`)
                const sorted = [...res.data].sort(bySchedule)
                setTrailers(sorted)
                setFiltered(sorted)
                setCurrentDock('All')
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        })()
    }, [opDate, shift])

    const filterByDock = (dock: string) => {
        setFiltered(filterTrailersByDock(trailers, dock))
        setCurrentDock(dock || 'All')
    }

    const getBgc = (trl: TrailerRecord, index: number) =>
        trl.statusOX === 'P' ? 'orange' : index % 2 === 0 ? '#cac8c8' : '#fff'

    const showPlantFilters = isPlantDockView(currentDock) || currentDock === 'V' || currentDock === 'U'

    // Counts follow the dock filter, so 'All' gives the whole shift.
    const statusCounts = filtered.reduce<Record<string, number>>((acc, t) => {
        const code = (t.statusOX || '').trim().toUpperCase()
        if (code) acc[code] = (acc[code] ?? 0) + 1
        return acc
    }, {})
    const carriedOverCount = filtered.filter(carriedOver).length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center', padding: '12px 20px' }}>
                <a href="/" className="btn btn-secondary mt-3">Back to Landing</a>
                <TextField
                    variant="outlined"
                    size="small"
                    label="Date"
                    type="date"
                    value={opDate}
                    onChange={e => setOpDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ width: 180 }}
                />
                <TextField
                    variant="outlined"
                    size="small"
                    label="Shift"
                    select
                    value={shift}
                    onChange={e => setShift(e.target.value)}
                    sx={{ width: 120 }}
                >
                    {SHIFTS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                <a onClick={() => setShowSummary(s => !s)} className="btn btn-secondary mt-3">
                    {showSummary ? 'Hide Summary' : 'Shift Summary'}
                </a>
                <button onClick={downloadShift} className="btn btn-info mt-3" disabled={loading || trailers.length === 0}>
                    Download Shift CSV ({trailers.length})
                </button>
                <button onClick={downloadDay} className="btn btn-info mt-3" disabled={dayLoading}>
                    {dayLoading ? 'Downloading…' : 'Download Day CSV'}
                </button>
                <span style={{ color: '#666', fontSize: 14 }}>
                    {loading ? 'Loading…' : `${filtered.length} trailer${filtered.length !== 1 ? 's' : ''}`}
                </span>
                {downloadError && <span style={{ color: 'red', fontSize: 14 }}>{downloadError}</span>}
            </div>

            <h1 style={{ textAlign: 'center', marginTop: '1%' }}>Past Shifts</h1>
            <h3 style={{ textAlign: 'center' }}>{opDate} — {shift} Shift</h3>

            <div style={{ display: 'flex', flexDirection: 'row', width: '90%', justifyContent: 'space-around', alignItems: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                <a onClick={() => filterByDock('plant')} className="btn btn-secondary mt-3">Plant</a>
                <a onClick={() => filterByDock('All')}   className="btn btn-secondary mt-3">All</a>
                <a onClick={() => filterByDock('Y')}     className="btn btn-secondary mt-3">Dropyard</a>
            </div>

            {showSummary && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    justifyContent: 'center',
                    width: '90%',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    marginTop: 16,
                }}>
                    {SUMMARY_CODES.map(([code, label]) => (
                        <div key={code} style={{
                            minWidth: 110,
                            padding: '10px 16px',
                            border: '1px solid #ccc',
                            borderRadius: 6,
                            textAlign: 'center',
                            backgroundColor: getBackground(code),
                        }}>
                            <div style={{ fontSize: 24, fontWeight: 600 }}>{statusCounts[code] ?? 0}</div>
                            <div style={{ fontSize: 13 }}>{label}</div>
                        </div>
                    ))}
                    <div
                        title="Arrived but not emptied by the end of the shift, so the roll carried it into the next one"
                        style={{
                            minWidth: 110,
                            padding: '10px 16px',
                            border: '1px solid #ccc',
                            borderRadius: 6,
                            textAlign: 'center',
                            backgroundColor: '#e9d8fd',
                        }}
                    >
                        <div style={{ fontSize: 24, fontWeight: 600 }}>{carriedOverCount}</div>
                        <div style={{ fontSize: 13 }}>Carried Over</div>
                    </div>
                    <div style={{
                        minWidth: 110,
                        padding: '10px 16px',
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 24, fontWeight: 600 }}>{filtered.length}</div>
                        <div style={{ fontSize: 13 }}>Total</div>
                    </div>
                </div>
            )}

            {showPlantFilters && (
                <div style={{ display: 'flex', flexDirection: 'row', width: '90%', justifyContent: 'space-around', alignItems: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                    {DOCK_BUTTONS.map(d => (
                        <a key={d} onClick={() => filterByDock(d)} className="btn btn-secondary mt-3">{d}</a>
                    ))}
                </div>
            )}

            <div style={{ padding: '20px', flex: 1, overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', height: '100%', position: 'relative' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                        <thead>
                            <tr style={{ position: 'sticky', top: 0, zIndex: 20, background: 'white', width: '100%' }}>
                                <th style={th}>#</th>
                                <th style={th}>Date/Shift</th>
                                <th style={th}>Hour</th>
                                <th style={th}>Load #</th>
                                <th style={th}>Dock Code</th>
                                <th style={th}>Aca Type</th>
                                <th style={th}>Status</th>
                                <th style={th}>Route Id</th>
                                <th style={th}>Scac</th>
                                <th style={th}>DOH</th>
                                <th style={th}>Trailer1</th>
                                <th style={th}>Trailer2</th>
                                <th style={th}>Door</th>
                                <th style={th}>1st Supplier</th>
                                <th style={th}>Dock Stop Seq</th>
                                <th style={th}>Plan Start Date</th>
                                <th style={th}>Plan Start Time</th>
                                <th style={th}>Gate Arrival</th>
                                <th style={th}>Dock Start</th>
                                <th style={th}>Dock End</th>
                                <th style={th}>Status OX</th>
                                <th style={th}>Load Comments</th>
                                <th style={th}>Ryder Comments</th>
                                <th style={th}>GM Comments</th>
                                <th style={th}>Dock Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((trl, index) => (
                                <tr key={trl.uuid || index} style={{ borderBottom: '1px solid #eee', backgroundColor: getBgc(trl, index) }}>
                                    <td style={td}>{index + 1}</td>
                                    <td style={td}>{trl.dateShift}</td>
                                    <td style={td}>{trl.hour}</td>
                                    <td style={td}>{trl.lmsAccent}</td>
                                    <td style={td}>{trl.dockCode}</td>
                                    <td style={td}>{trl.acaType}</td>
                                    <td style={td}>{trl.status}</td>
                                    <td style={td}>{trl.routeId}</td>
                                    <td style={td}>{trl.scac}</td>
                                    <td style={td}>{trl.lowestDoh}</td>
                                    <td style={td}>{trl.trailer1}</td>
                                    <td style={td}>{trl.trailer2}</td>
                                    <td style={td}>{trl.door}</td>
                                    <td style={td}>{trl.firstSupplier}</td>
                                    <td style={td}>{trl.dockStopSequence}</td>
                                    <td style={td}>{trl.scheduleStartDate}</td>
                                    <td style={td}>{trl.adjustedStartTime}</td>
                                    <td style={td}>{trl.gateArrivalTime}</td>
                                    <td style={td}>{trl.actualStartTime}</td>
                                    <td style={td}>{trl.actualEndTime}</td>
                                    <td style={{ ...td, backgroundColor: getBackground(trl.statusOX) }}>{trl.statusOX}</td>
                                    <td style={td}>{trl.loadComments}</td>
                                    <td style={td}>{trl.ryderComments}</td>
                                    <td style={td}>{trl.gmComments}</td>
                                    <td style={td}>{trl.dockComments}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && filtered.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888', marginTop: 32 }}>No records for this date / shift.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PastShifts
