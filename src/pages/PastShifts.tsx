import { useEffect, useState } from 'react'
import { type TrailerRecord } from '../signals/signals'
import { api } from '../utils/api'
import { getBackground } from '../utils/helpers'
import { TextField, MenuItem } from '@mui/material'

const SHIFTS = ['1st', '2nd', '3rd']
const PLANT_DOCKS = new Set(['A', 'BE', 'BN', 'BW', 'D', 'E', 'F', 'F1', 'P', 'V', 'U'])

const th = { padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' } as const
const td = { border: '1px solid #eee' } as const

// statusOX codes counted in the shift summary, in display order.
const SUMMARY_CODES: [string, string][] = [
    ['O', 'On Time'],
    ['E', 'Early'],
    ['L', 'Late'],
    ['N', 'No Show'],
    ['C', 'Carry Over'],
    ['R', 'Reschedule'],
]

const PastShifts = () => {
    const [trailers, setTrailers] = useState<TrailerRecord[]>([])
    const [filtered, setFiltered] = useState<TrailerRecord[]>([])
    const [opDate, setOpDate] = useState<string>(new Date(Date.now()).toLocaleDateString('en-CA'))
    const [shift, setShift] = useState<string>('1st')
    const [currentDock, setCurrentDock] = useState<string>('All')
    const [loading, setLoading] = useState(false)
    const [showSummary, setShowSummary] = useState(false)

    useEffect(() => {
        if (!opDate || !shift) return
        const operationalDate = `${opDate}-${shift}`
        setLoading(true)
        ;(async () => {
            try {
                console.log('Fetching past shift data for', operationalDate)
                const res = await api.get<TrailerRecord[]>(`/api/get_past_shift/${operationalDate}`)
                const sorted = [...res.data].sort((a, b) => {
                    const ta = new Date(`${a.scheduleStartDate} ${a.adjustedStartTime}`).getTime()
                    const tb = new Date(`${b.scheduleStartDate} ${b.adjustedStartTime}`).getTime()
                    return ta - tb
                })
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
        if (dock === 'plant') {
            setFiltered(trailers.filter(t => PLANT_DOCKS.has(t.dockCode.trim())))
        } else if (dock === 'All') {
            setFiltered(trailers)
        } else if (dock === 'Y') {
            setFiltered(trailers.filter(t => t.dockCode.trim() === 'Y'))
        } else {
            setFiltered(trailers.filter(t => t.dockCode.trim() === dock))
        }
        setCurrentDock(dock)
    }

    const getBgc = (trl: TrailerRecord, index: number) =>
        trl.statusOX === 'P' ? 'orange' : index % 2 === 0 ? '#cac8c8' : '#fff'

    const showPlantFilters = PLANT_DOCKS.has(currentDock) || currentDock === 'plant'

    // Counts follow the dock filter, so 'All' gives the whole shift.
    const statusCounts = filtered.reduce<Record<string, number>>((acc, t) => {
        const code = (t.statusOX || '').trim().toUpperCase()
        if (code) acc[code] = (acc[code] ?? 0) + 1
        return acc
    }, {})

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
                <span style={{ color: '#666', fontSize: 14 }}>
                    {loading ? 'Loading…' : `${filtered.length} trailer${filtered.length !== 1 ? 's' : ''}`}
                </span>
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
                    {[...PLANT_DOCKS].map(d => (
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
