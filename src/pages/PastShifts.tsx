import { useEffect, useState } from 'react'
import { type TrailerRecord } from '../signals/signals'
import { api } from '../utils/api'
import { getBackground } from '../utils/helpers'
import { TextField, MenuItem } from '@mui/material'

const SHIFTS = ['1st', '2nd', '3rd']
const PLANT_DOCKS = new Set(['A', 'BE', 'BN', 'BW', 'D', 'E', 'F', 'F1', 'P', 'V', 'U'])

const th = { padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' } as const
const td = { border: '1px solid #eee' } as const

const PastShifts = () => {
    const [trailers, setTrailers] = useState<TrailerRecord[]>([])
    const [filtered, setFiltered] = useState<TrailerRecord[]>([])
    const [opDate, setOpDate] = useState<string>(new Date(Date.now()).toLocaleDateString('en-CA'))
    const [shift, setShift] = useState<string>('1st')
    const [currentDock, setCurrentDock] = useState<string>('All')
    const [loading, setLoading] = useState(false)

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
                                <th style={th}>Late Comments</th>
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
                                    <td style={td}>{trl.lateComments}</td>
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
