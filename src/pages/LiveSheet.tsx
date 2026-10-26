import { useEffect, useState } from 'react'
import { door as d,
         editedTrl as e,
         type TrailerRecord,
         liveScreen,
         liveTrailers,
         filteredTrailers} from '../signals/signals'
import { dockCapacity } from '../signals/dockCapacity'
import { useAtom } from 'jotai'
import { TextField, MenuItem } from '@mui/material'
import { api } from '../utils/api'
import { isDetention, getBackground, getStatBackground, formatDetentionTime, trailerAlertClass, filterTrailersByDock, isPlantDockView, PLANT_DOCKS, setAside } from '../utils/helpers'
import { sortTrailers } from '../utils/sortTrailers'
import '../App.css'
import LiveAddOn from './LiveAddOn'
import useInterval from '../utils/useInterval'
import usePermissions, { Allowed } from '../utils/usePermissions'
import NotesCell from '../components/NotesCell'
import { saveTrailer } from '../utils/saveTrailer'
import useWsTopic from '../utils/useWsTopic'
import { LIVE_SHEET } from '../utils/wsTopics'

const SHIFTS = ['1st', '2nd', '3rd']

// The shift a roll moves into. 3rd ends after midnight, so 3rd -> 1st advances a day.
const nextDateShift = (date: string, shift: string): string => {
    if (!date) return ''
    if (shift === '1st') return `${date}-2nd`
    if (shift === '2nd') return `${date}-3rd`
    const [y, m, d] = date.split('-').map(Number)
    const next = new Date(y, m - 1, d + 1)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}-1st`
}

const STAT_CYCLE: Record<string, string> = { '': 'O', 'O': 'X', 'X': '' }

const LiveSheet = () => {
    const [trailers, setTrailers] = useAtom<TrailerRecord[]>(liveTrailers)
    const [filtered, setFiltered] = useAtom<TrailerRecord[]>(filteredTrailers)
    const [{ shift: shiftDockCapacity }] = useAtom(dockCapacity)
    const [editedTrl, setEdited] = useAtom<TrailerRecord>(e)
    const [door, setDoor] = useAtom(d)
    const [trailer1, setTrailer1] = useState('')
    const [screen, setScreen] = useAtom(liveScreen)
    const [currentDock, setCurrentDock] = useState('All')
    const [shift, setShift] = useState('')
    const [rollDate, setRollDate] = useState('')
    const [rollShiftLabel, setRollShiftLabel] = useState('')

    useInterval(() => { setFiltered(prev => [...prev]) }, 60000)

    // Live add-ons are pushed to this board only, so take that feed while open.
    useWsTopic(LIVE_SHEET)

    // Dock and security users get a trimmed sheet; see usePermissions
    const { can, why, fullSheet: full } = usePermissions()

    // Every trailer edit goes through saveTrailer, diffed against the row as this
    // sheet shows it so only the fields the edit touches are sent.
    const save = (updated: TrailerRecord) =>
        saveTrailer(updated, filtered.find(t => t.uuid === updated.uuid) ?? trailers.find(t => t.uuid === updated.uuid))

    // A comment box's save. A refusal is alerted by saveTrailer and rethrown,
    // so the box keeps the text with a red border.
    const saveComment = async (trl: TrailerRecord, field: 'loadComments' | 'ryderComments' | 'dockComments', text: string) => {
        const res = await save({ ...trl, [field]: text })
        const saved = res.data as TrailerRecord
        setFiltered((prev: TrailerRecord[]) => prev.map(t => t.uuid === saved.uuid ? saved : t))
    }

    // Orange calls for a Ryder comment: a late trailer, or a rescheduled one
    // that has none yet. Fills both the cell and its box so it can't be missed.
    const ryderOrange = (trl: TrailerRecord) =>
        trl.statusOX === 'L' || (setAside(trl.statusOX) && !trl.ryderComments) ? 'orange' : undefined

    const filterByDock = (dock: string) => {
        setFiltered(filterTrailersByDock(trailers, dock))
        setCurrentDock(dock || 'All')
    }

    const getDockCount = (dockCode: string): number => {
        if (dockCode === 'Plant') {
            return trailers.filter(t => PLANT_DOCKS.has(t.dockCode.trim()) && !setAside(t.statusOX)).length
        }
        return trailers.filter(t => t.dockCode.toUpperCase() === dockCode.toUpperCase() && !setAside(t.statusOX) && t.acaType !== 'IO Drop').length
    }

    const router = (screen: number) => {
        switch (screen) {
            case 0: {
                return showLiveSheet()
            }
            case 1: {
                return showGMComments()
            }
            case 2: {
                return showSetDoor()
            }
            case 5 :
                return <LiveAddOn />
            case 7:
                return setTrailer()
            case 8:
                return showLegend()
            case 9:
                return showRollConfirm()
            default: showLiveSheet()
        }
    }
    

    const arrived = async (field: string, trailer: TrailerRecord, payload: string) => {
        const now = (payload?.length === 0 || payload === undefined) ? new Date(Date.now()).toLocaleTimeString() : ''
        const date = (payload?.length === 0 || payload === undefined) ? new Date(Date.now()).toLocaleDateString('en-CA') : ''
        switch (field) {
            case 'gate': {
                {try {
                    let a = new Date(Date.now()).getTime()
                    let b = new Date(`${trailer.scheduleStartDate} ${trailer.adjustedStartTime}`).getTime()
                    let c = b + (1000 * 60 * 15)
                    let d = b - (1000 * 60 * 12)
                    let updatedTrailer = { ...trailer, gateArrivalTime: now, gateArrivalDate: date, statusOX: payload.length > 0 ? '' : a < d ? 'E' : a > c ? 'L' : 'O' }
                    const gateRes = await save(updatedTrailer)
                    const gateSaved = gateRes.data as TrailerRecord
                    setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === gateSaved.uuid ? gateSaved : t
                            )
                        );
                    await sendSlackNotification(gateSaved, gateSaved.statusOX)
                    if (gateSaved.statusOX === 'L') {
                        await notifyCarrierLate(gateSaved)
                    }
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            case 'door': {
                {try {
                    let updatedTrailer = payload?.length > 0 ? { ...trailer, doorArrivalTime: '', door: '' } : { ...trailer, doorArrivalTime: now, doorArrivalDate: date }
                    const doorRes = await save(updatedTrailer)
                    const doorSaved = doorRes.data as TrailerRecord
                    setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === doorSaved.uuid ? doorSaved : t
                            )
                        );
                    if ((doorSaved.dockCode === 'U' || doorSaved.dockCode === 'V') && doorSaved.doorArrivalTime !== '') {
                        setEdited(doorSaved)
                        setScreen(2)
                    }
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            case 'start': {
                {try {
                    let updatedTrailer = payload.length > 0 ? { ...trailer, actualStartTime: '' } : { ...trailer, actualStartTime: now, actualStartDate: date }
                    const startRes = await save(updatedTrailer)
                    const startSaved = startRes.data as TrailerRecord
                    setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === startSaved.uuid ? startSaved : t
                            )
                        );
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            case 'end': {
                {try {
                    let updatedTrailer = { ...trailer, actualEndTime: now, actualEndDate: date }
                    const endRes = await save(updatedTrailer)
                    const endSaved = endRes.data as TrailerRecord
                    setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === endSaved.uuid ? endSaved : t
                            )
                        );
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            default: break;
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const trls = await api.get('/api/get_live_trailers')
                trls.data = sortTrailers(trls.data)
                const t = trls.data.filter((a: any) => a.statusOX !== 'C' && !setAside(a.statusOX) && a.statusOX !== 'N')
                if (t.length === 0) {setShift('N/A')} else {setShift(getShift(t[0]?.adjustedStartTime || '1st'))}
                console.log(trls.data)
                setTrailers(trls.data)
                setFiltered(trls.data)
            } catch (error) {
                console.log(error)
            }
        })()
    },[])

    const getShift = (t: string) => {
        if (t.length === 0) return 'N/A'
        let hrs = parseInt(t.split(':')[0])
        if (hrs >= 6 && hrs < 14) return '1st'
        if (hrs >= 14 && hrs < 22) return '2nd'
        return '3rd'
    }

    const updateScreen = (screen: number, trailer: TrailerRecord) => {
        const updatedTrailer =
            screen === 1
                ? {
                    ...trailer,
                    gmComments: `${trailer.trailer1} was sent back at ${getHoursMins()} ( ${shift}) `
                }
                : trailer;

        setEdited(updatedTrailer);
        setScreen(screen);
    };

    const setTrailer = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, trailer1: value}
            setTrailer1(value)
            setEdited(updated)
        }
        const setT = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const trlRes = await save(updatedTrailer)
                const trlSaved = trlRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === trlSaved.uuid ? trlSaved : t
                            )
                        );
                setScreen(0)
            } catch (error) {
                console.log(error)
            }
        }
        return(
            <>
                <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%'}}>Set Trailer</h1>
                <h4 style={{ textAlign: 'center', marginTop: '5%'}}>Trailer: {editedTrl?.trailer1} SCAC: {editedTrl?.scac} Route: {editedTrl?.routeId} </h4>
                <TextField  sx={{ marginLeft: '3%', '& .MuiInputBase-input': { textAlign: 'center' }}} variant='standard' id='trailer1' value={trailer1} onChange={handleChange} />
                { editedTrl &&
                    <a onClick={() => setT()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Set Trailer
                    </a>
                }
                <a onClick={() => setScreen(0)} className="btn btn-danger mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Back
                </a>
            </div>
            </>
        )

    }

    const showSetDoor = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, door: value}
            setDoor(value)
            setEdited(updated)
        }
        const setD = async () => {
            try {
                const updatedTrailer = {...editedTrl}
                const doorSetRes = await save(updatedTrailer)
                const doorSetSaved = doorSetRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === doorSetSaved.uuid ? doorSetSaved : t
                            )
                        );
                setScreen(0)
            } catch (error) {
                console.log(error)
            }
        }
        return(
            <>
                <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%'}}>Set Door</h1>
                <h4 style={{ textAlign: 'center', marginTop: '5%'}}>Trailer: {editedTrl?.trailer1} SCAC: {editedTrl?.scac} Route: {editedTrl?.routeId} </h4>
                <TextField  sx={{ marginLeft: '3%', '& .MuiInputBase-input': { textAlign: 'center' }}} variant='standard' id='door' value={door} onChange={handleChange} />
                { editedTrl &&
                    <a onClick={() => setD()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Set Door
                    </a>
                }
            </div>
            </>
        )
    }



    const openRollConfirm = () => {
        if (!can('rollShift')) {
            return
        }

        // An on-time trailer is the surest source — its scheduled start sits inside
        // the shift being rolled. scheduleStartDate is already YYYY-MM-DD.
        const onTime = trailers.find((t: TrailerRecord) => t.statusOX === 'O')
        if (onTime?.scheduleStartDate) {
            setRollDate(onTime.scheduleStartDate)
            setRollShiftLabel(getShift(onTime.adjustedStartTime || ''))
            setScreen(9)
            return
        }

        // Fallback when nothing ran on time: derive from the clock. The roll usually
        // lands in the first hour of the NEXT shift, so look back an hour to land
        // inside the shift actually being closed out.
        const pad = (n: number) => String(n).padStart(2, '0')
        const ref = new Date()
        ref.setHours(ref.getHours() - 1)
        const s = getShift(`${pad(ref.getHours())}:${pad(ref.getMinutes())}`)
        // 3rd shift runs past midnight, so before 06:00 the op date is the day before
        if (s === '3rd' && ref.getHours() < 6) {
            ref.setDate(ref.getDate() - 1)
        }
        setRollDate(`${ref.getFullYear()}-${pad(ref.getMonth() + 1)}-${pad(ref.getDate())}`)
        setRollShiftLabel(s)
        setScreen(9)
    }

    const rollShift = async () => {
        try {
            if (!can('rollShift')) {
                return
            }
            if (!rollDate || !rollShiftLabel) {
                return
            }
            await api.post(`api/roll_next_shift`, {
                operational_date: rollDate,
                next_date_shift:  nextDateShift(rollDate, rollShiftLabel),
            })
            window.location.reload()
        } catch (error) {
            console.log(error)
        }
    }

    const showRollConfirm = () => {
        // What the archived records will actually be filed under: get_past_shift
        // matches OpDate.date, then filters on each record's own dateShift.
        const dateShifts = [...new Set(trailers.map(t => t.dateShift).filter(Boolean))]
        const hasOnTime = trailers.some((t: TrailerRecord) => t.statusOX === 'O')
        return (
            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 520, margin: '0 auto' }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%' }}>Confirm Shift Roll</h1>
                <p style={{ textAlign: 'center', color: '#aaa', marginTop: '3%' }}>
                    The live sheet will be archived under this operational date, completed
                    trailers removed, and staged trailers promoted. This cannot be undone.
                </p>

                <TextField
                    variant="outlined"
                    size="small"
                    label="Operational Date"
                    type="date"
                    value={rollDate}
                    onChange={e => setRollDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ marginTop: '4%' }}
                />

                <TextField
                    variant="outlined"
                    size="small"
                    label="Shift Being Rolled"
                    select
                    value={rollShiftLabel}
                    onChange={e => setRollShiftLabel(e.target.value)}
                    sx={{ marginTop: '3%' }}
                >
                    {SHIFTS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>

                <div style={{ marginTop: '4%', lineHeight: 1.9 }}>
                    <div><strong>Trailers on the sheet:</strong> {trailers.length}</div>
                    <div><strong>Filed under:</strong> {dateShifts.length > 0 ? dateShifts.join(', ') : '—'}</div>
                    <div>
                        <strong>Carryovers re-stamped to:</strong>{' '}
                        {nextDateShift(rollDate, rollShiftLabel) || '—'}
                    </div>
                    {!hasOnTime &&
                        <div style={{ color: 'orange' }}>
                            No on-time trailers — date estimated from the clock. Check it.
                        </div>
                    }
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: '6%' }}>
                    <a onClick={() => rollShift()} className="btn btn-danger">Confirm Roll</a>
                    <a onClick={() => setScreen(0)} className="btn btn-secondary">Cancel</a>
                </div>
            </div>
        )
    }

    const getHoursMins = (
        utcTimestamp: string | Date = new Date()
    ): string => {
        const date =
            utcTimestamp instanceof Date
                ? utcTimestamp
                : new Date(utcTimestamp);

        if (Number.isNaN(date.getTime())) {
            throw new Error('Invalid UTC timestamp');
        }

        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23'
        }).format(date);
    };

    const showGMComments = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, gmComments: value}
            setEdited(updated)
        }
        const setComments = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const gmRes = await save(updatedTrailer)
                const gmSaved = gmRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === gmSaved.uuid ? gmSaved : t
                            )
                        );
                setScreen(0)
            } catch (error) {
                console.log(error)
            }
        }
        return(
            <>
                <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%'}}>Set GM Comments</h1>
                <h4 style={{ textAlign: 'center', marginTop: '5%'}}>Trailer: {editedTrl?.trailer1} SCAC: {editedTrl?.scac} Route: {editedTrl?.routeId} </h4>
                <TextField  sx={{ marginLeft: '3%', '& .MuiInputBase-input': { textAlign: 'center' }}} variant='standard' id='door' value={editedTrl?.gmComments} onChange={handleChange} />
                { editedTrl &&
                    <a onClick={() => setComments()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Set Comments
                    </a>
                }
            </div>
            </>
        )
    }


    const showLegend = () => {
        const row: React.CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
        }
        const swatch: React.CSSProperties = {
            width: 36,
            height: 36,
            borderRadius: 4,
            border: '1px solid #ccc',
            flexShrink: 0,
        }
        return (
            <div style={{ padding: '5% 8%', maxWidth: 600, margin: '0 auto' }}>
                <h2 onClick={() => setScreen(0)} style={{ marginBottom: '8%' }}>Legend</h2>

                <div style={row}>
                    <div style={{ ...swatch, backgroundColor: 'orange' }} />
                    <div>
                        <strong>Pending Late (P)</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer has no gate arrival time 15 minutes past the scheduled
                            start time. Check to see if this trailer has arrived. If not, click
                            {'⠈'}<strong>Confirm Late</strong>. If it is here and you forgot to press 
                            the arrived button, click the <strong>Not Late</strong> button to 
                            override the late label and give an on time window time.
                        </p>
                    </div>
                </div>

                <div style={row}>
                    <div style={{
                        ...swatch,
                        animation: 'flash-gate-wait 2s ease-in-out infinite',
                    }} />
                    <div>
                        <strong>Waiting to Be Sent Back (flashing blue)</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer checked in at the gate more than 15 minutes ago and hasn't been
                            sent back to the dock. Send it back through <strong>GM Comments</strong>, which
                            records the time.
                        </p>
                    </div>
                </div>

                <div style={row}>
                    <div style={{
                        ...swatch,
                        animation: 'flash-sent-back 2s ease-in-out infinite',
                    }} />
                    <div>
                        <strong>Sent Back, Not at the Dock (flashing yellow)</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer was sent back more than 15 minutes ago but isn't in a door yet. At
                            VAA and Universal that means a door arrival with a door number set; at plant
                            docks, unloading started.
                        </p>
                    </div>
                </div>

                <div style={row}>
                    <div style={{
                        ...swatch,
                        animation: 'flash-detention 2s ease-in-out infinite',
                    }} />
                    <div>
                        <strong>Detention Risk (flashing)</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer is in a door but hasn't been emptied more than 60 minutes past its
                            scheduled start time. The detention clock is running — the time shown is how
                            long it has been sitting. Blue and yellow take precedence, so a trailer stuck
                            earlier shows where it's stuck; late trailers never reach detention.
                        </p>
                    </div>
                </div>

                <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '0 0 20px 52px' }}>
                    Dropyard (Y) trailers and ARS shuttle routes aren't monitored and never flash.
                </p>

                <div style={row}>
                    <div style={{
                        ...swatch,
                        backgroundColor: 'fuchsia',
                    }} />
                    <div>
                        <strong>Add On</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer was adden in shift
                        </p>
                    </div>
                </div>

                <div style={row}>
                    <div style={{
                        ...swatch,
                        backgroundColor: 'gray',
                    }} />
                    <div>
                        <strong>Rescheduled / Already Delivered</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer was rescheduled (R) or already delivered (D)
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const formatTime12Hour = (time24: string): string => {
        const [hours, minutes] = time24.split(':').map(Number);
        console.log(time24)
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')}:00 ${period}`;
    };

    const getBgc = (trl: TrailerRecord, index: number) => {
        if (trl.statusOX === 'C') return 'yellow'
        if (trl.statusOX === 'P') return 'orange'
        if (setAside(trl.statusOX)) return 'gray'
        if (trl.acaType.toLowerCase().includes('shift')) return 'rgb(238, 130, 238)'
        return index % 2 === 0 ? '#cac8c8' : '#fff'
    }

    const notifyCarrierLate = async (trl: TrailerRecord) => {
        try {
            await api.post('/api/notify_carrier_late', {
                scac:           trl.scac,
                load_no:        trl.lmsAccent,
                route_id:       trl.routeId,
                scheduled_date: trl.scheduleStartDate,
                scheduled_time: trl.adjustedStartTime,
                dock:           trl.dockCode,
            })
        } catch (error) {
            console.error('Failed to send carrier late notification:', error)
        }
    }

    // Slack only hears about lates and reschedules. A late arrival comes from the
    // gate scan; Confirm Late (or picking L) marks one that hasn't shown up yet.
    const sendSlackNotification = async (trl: TrailerRecord, newStatus: string) => {
        const base = `Load: ${trl.lmsAccent} | Route: ${trl.routeId} | SCAC: ${trl.scac} | Trailer: ${trl.trailer1} | Dock: ${trl.dockCode}`

        let text = ''
        switch (newStatus) {
            case 'R':
                text = `:arrows_counterclockwise: *Rescheduled*\n${base} | New Date: ${trl.scheduleStartDate} | New Time: ${trl.adjustedStartTime}`
                break
            case 'L':
                text = trl.gateArrivalTime
                    ? `:warning: *Late Arrival*\n${base} | Scheduled: ${trl.scheduleStartDate} @ ${trl.adjustedStartTime} | Gate Arrival: ${trl.gateArrivalTime}`
                    : `:warning: *Confirmed Late*\n${base} | Scheduled: ${trl.scheduleStartDate} @ ${trl.adjustedStartTime}`
                break
            default:
                return
        }

        const channel = newStatus === 'R' ? 'reschedules' : 'late'
        try {
            await api.post('/api/send_slack', { text, channel, route: trl.routeId })
        } catch (error) {
            console.error('Slack notification failed:', error)
        }
    }

    const getDockButtonStyle = (dockCode: string) => {
        const count = parseInt(String(getDockCount(dockCode)), 10);
        const rawCapacity = shiftDockCapacity.get(shift)?.[dockCode];

        // Missing capacities, such as D/P, will not be marked over capacity.
        const capacity =
            rawCapacity === undefined
                ? NaN
                : parseInt(String(rawCapacity), 10);

        const overCapacity = !Number.isNaN(capacity) && count > capacity;

        return {
            marginLeft: 'auto',
            marginRight: 'auto',
            backgroundColor: overCapacity ? 'red' : '#6c757d',
            color: overCapacity ? 'white' : 'white'
        };
    };

    const showLiveSheet = () => {

        const handleStatusChange = async (trailer: TrailerRecord, newValue: string, updateTime: boolean) => {
            try {
                const time = formatTime12Hour(trailer.adjustedStartTime)
                const updatedTrailer = { 
                ...trailer, 
                statusOX: newValue,
                gateArrivalTime: updateTime ? time : trailer.gateArrivalTime
                };
                
                // Update database
                const statusRes = await save(updatedTrailer)
                const statusSaved = statusRes.data as TrailerRecord

                setFiltered(prev => prev.map(t =>
                    t.uuid === statusSaved.uuid ? statusSaved : t
                ));

                await sendSlackNotification(statusSaved, newValue)

                if (newValue === 'L') {
                    await notifyCarrierLate(statusSaved)
                }

                if (!updateTime && newValue === 'L') {
                    setEdited(statusSaved)
                }
                
            } catch (error) {
                console.error('Failed to update status:', error);
            }
        };

        const handleStatChange = async (trailer: TrailerRecord) => {
            try {
                const stat = STAT_CYCLE[trailer.stat ?? ''] ?? 'O'
                // X is received: stamp when, and clear it again once X comes off
                const received = stat === 'X'
                    ? { receivedDate: new Date().toLocaleDateString('en-CA'), receivedTime: new Date().toLocaleTimeString() }
                    : { receivedDate: '', receivedTime: '' }
                const updatedTrailer = { ...trailer, stat, ...received }

                const statRes = await save(updatedTrailer)
                const statSaved = statRes.data as TrailerRecord

                setFiltered(prev => prev.map(t =>
                    t.uuid === statSaved.uuid ? statSaved : t
                ));
            } catch (error) {
                console.error('Failed to update stat:', error);
            }
        };

        return (
            <>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    width: '100%',
                    overflow: 'auto'
                }}>
                    <a href='/overview'><h1 style={{ textAlign: 'center', marginTop: '1%' }}>Live Sheet</h1></a>
                    <h3 style={{ textAlign: 'center', marginTop: '1%' }}>{shift} Shift</h3>
                    <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '90%',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                    }}>
                        <a href='/nextShift' className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Next Shift
                        </a>
                        <a onClick={() => filterByDock('V')} className="btn btn-secondary mt-3" style={getDockButtonStyle('V')}>
                            VAA ({getDockCount('V')} / {shiftDockCapacity.get(shift)?.['V']})
                        </a>
                        <a onClick={() => filterByDock('U')} className="btn btn-secondary mt-3" style={getDockButtonStyle('U')}>
                            Universal ({getDockCount('U')} / {shiftDockCapacity.get(shift)?.['U']})
                        </a>
                        <a onClick={() => filterByDock('plant')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Plant  ({getDockCount('Plant')})
                        </a>
                        <a onClick={() => filterByDock('All')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            All ({trailers.filter(t => t.dockCode !== 'Y').length})
                        </a>
                        <a onClick={() => setScreen(8)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Legend
                        </a>
                        <Allowed action="rollShift"><a onClick={() => openRollConfirm()} className="btn btn-danger mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Roll Shift
                        </a></Allowed>
                    </div>
                    {
                        isPlantDockView(currentDock) &&
                        <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '90%',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                        }}>
                            <a onClick={() => filterByDock('A')} className="btn btn-secondary mt-3" style={getDockButtonStyle('A')}>
                                A ({getDockCount('A')} / {shiftDockCapacity.get(shift)?.['A']})
                            </a>
                            <a onClick={() => filterByDock('BE')} className="btn btn-secondary mt-3" style={getDockButtonStyle('BE')}>
                                BE ({getDockCount('BE')} / {shiftDockCapacity.get(shift)?.['BE']})
                            </a>
                            <a onClick={() => filterByDock('BN')} className="btn btn-secondary mt-3" style={getDockButtonStyle('BN')}>
                                BN ({getDockCount('BN')} / {shiftDockCapacity.get(shift)?.['BN']})
                            </a>
                            <a onClick={() => filterByDock('BW')} className="btn btn-secondary mt-3" style={getDockButtonStyle('BW')}>
                                BW ({getDockCount('BW')} / {shiftDockCapacity.get(shift)?.['BW']})
                            </a>
                            <a onClick={() => filterByDock('D')} className="btn btn-secondary mt-3" style={getDockButtonStyle('D')}>
                                D ({getDockCount('D')} / {shiftDockCapacity.get(shift)?.['D']})
                            </a>
                            <a onClick={() => filterByDock('E')} className="btn btn-secondary mt-3" style={getDockButtonStyle('E')}>
                                E ({getDockCount('E')} / {shiftDockCapacity.get(shift)?.['E']})
                            </a>
                            <a onClick={() => filterByDock('F')} className="btn btn-secondary mt-3" style={getDockButtonStyle('F')}>
                                F ({getDockCount('F')} / {shiftDockCapacity.get(shift)?.['F']})
                            </a>
                            <a onClick={() => filterByDock('F1')} className="btn btn-secondary mt-3" style={getDockButtonStyle('F1')}>
                                F1 ({getDockCount('F1')} / {shiftDockCapacity.get(shift)?.['F1']})
                            </a>
                            <a onClick={() => filterByDock('P')} className="btn btn-secondary mt-3" style={getDockButtonStyle('P')}>
                                P ({getDockCount('P')} / {shiftDockCapacity.get(shift)?.['P']})
                            </a>
                        </div>
                    }
                    <div style={{ padding: '20px', flex: 1, overflow: 'hidden' }}>
                        <div style={{ overflow: 'auto', height: '100%', position: 'relative' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                                <thead>
                                    <tr style={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 20,
                                    background: 'white',
                                    width: '100%',
                                    }}>
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>#</th>}
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Date/Shift</th>}
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Hour</th>}
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Load #</th>
                                        { currentDock !== '' && currentDock.toLowerCase() !== 'all' && currentDock.toLowerCase() !== 'plant' &&
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Code</th>
                                        }
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Aca Type</th>}
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Status</th>}
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Route Id</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Scac</th>
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>DOH</th>}
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer1</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer2</th>
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Door</th>}
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>1st Supplier</th>
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Stop Sequence</th>}
                                        {full && <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Plan Start Date</th>}
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Plan Start Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Gate Arrival Time</th>
                                        {   full && (currentDock === 'U' || currentDock === 'V') &&
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Door Arrival Time</th>
                                        }
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Start Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock End Time</th>
                                        {full && (
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Status 0X</th>
                                        )}
                                        {full && (
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Stat</th>
                                        )}
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Load Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Traffic Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Security Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        filtered?.map((trl: TrailerRecord, index: number) => {
                                            return (
                                                <tr key={index} style={{
                                                    borderBottom: '1px solid #eee', position: 'sticky',
                                                    backgroundColor: getBgc(trl, index)
                                                    }}
                                                    className={trailerAlertClass(trl)}
                                                >
                                                    {full && <td style={{border: '1px solid #eee'}}>{index + 1}</td>}
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.dateShift}</td>}
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.hour}</td>}
                                                    <td style={{border: '1px solid #eee'}}>{trl.lmsAccent}</td>
                                                    {
                                                        currentDock !== '' && currentDock.toLowerCase() !== 'all' && currentDock.toLowerCase() !== 'plant' && (
                                                            <td style={{border: '1px solid #eee'}}>{trl.dockCode}</td>
                                                        )
                                                    }
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.acaType}</td>}
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.status}</td>}
                                                    <td style={{border: '1px solid #eee'}}>{trl.routeId}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.scac}</td>
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.lowestDoh}</td>}
                                                    {
                                                        trl.trailer1.length > 0 ?
                                                        <td style={{border: '1px solid #eee'}}><Allowed action="trailer" dim={false}><a onClick={() => updateScreen(7, trl)}>{trl.trailer1}</a></Allowed></td>
                                                        :
                                                        <td style={{border: '1px solid #eee'}}><Allowed action="trailer"><a onClick={() => updateScreen(7, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Set Trailer</a></Allowed></td>
                                                    }
                                                    <td style={{border: '1px solid #eee'}}>{trl.trailer2}</td>
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.door}</td>}
                                                    <td style={{border: '1px solid #eee'}}>{trl.firstSupplier}</td>
                                                    {full && (
                                                    <td style={{border: '1px solid #eee'}}>{
                                                        isDetention(trl)[0] ?
                                                            formatDetentionTime(isDetention(trl)[1])
                                                            :
                                                            trl.dockStopSequence
                                                        }</td>
                                                    )}
                                                    {full && <td style={{border: '1px solid #eee'}}>{trl.scheduleStartDate}</td>}
                                                    <td style={{border: '1px solid #eee'}}>{trl.adjustedStartTime}</td>
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {setAside(trl.statusOX) ?
                                                            <span style={{ color: '#888' }}>{trl.gateArrivalTime || '—'}</span>
                                                            : trl.gateArrivalTime.length === 0 ?
                                                            <Allowed action="gate"><a onClick={() => arrived('gate', trl, trl.gateArrivalTime)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Arrived
                                                            </a></Allowed>
                                                            :
                                                            <Allowed action="gate" dim={false}><a onClick={() => arrived('gate', trl, trl.gateArrivalTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gateArrivalTime}
                                                            </a></Allowed>
                                                        }
                                                    </td>
                                                    {
                                                        full && (currentDock === 'U' || currentDock === 'V') &&
                                                        <td style={{border: '1px solid #eee'}}>
                                                            {setAside(trl.statusOX) ?
                                                                <span style={{ color: '#888' }}>{trl.doorArrivalTime || '—'}</span>
                                                                : (trl.doorArrivalTime?.length === 0 || trl.doorArrivalTime === undefined) ?
                                                                <Allowed action="door"><a onClick={() => arrived('door', trl, trl.doorArrivalTime)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    Arrived
                                                                </a></Allowed>
                                                                :
                                                                <Allowed action="door" dim={false}><a onClick={() => arrived('door', trl, trl.doorArrivalTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    {trl.doorArrivalTime}
                                                                </a></Allowed>
                                                            }
                                                        </td>
                                                    }
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {setAside(trl.statusOX) ?
                                                            <span style={{ color: '#888' }}>{trl.actualStartTime || '—'}</span>
                                                            : trl.actualStartTime.length > 0 ?
                                                            <Allowed action="unload" dim={false}><a onClick={() => arrived('start', trl, trl.actualStartTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualStartTime}
                                                            </a></Allowed>
                                                            :
                                                            <Allowed action="unload"><a onClick={() => arrived('start', trl, trl.actualStartTime)} className='btn btn-secondary mt-3' style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Unload
                                                            </a></Allowed>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {setAside(trl.statusOX) ?
                                                            <span style={{ color: '#888' }}>{trl.actualEndTime || '—'}</span>
                                                            : trl.actualEndTime.length > 0 ?
                                                            <Allowed action="unload" dim={false}><a onClick={() => arrived('end', trl, trl.actualEndTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualEndTime}
                                                            </a></Allowed>
                                                            :
                                                            <Allowed action="unload"><a onClick={() => arrived('end', trl, trl.actualEndTime)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Empty
                                                            </a></Allowed>
                                                        }
                                                    </td>
                                                    {full && (
                                                    <td style={{border: '1px solid #eee', backgroundColor: getBackground(trl.statusOX)}}>
                                                        <select 
                                                            id="statusOX" 
                                                            value={trl.statusOX || ''} 
                                                            onChange={(e) => handleStatusChange(trl, e.target.value, false)}
                                                            disabled={!can('status')}
                                                            title={can('status') ? undefined : why('status')}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="O">O - On Time</option>
                                                            <option value="L">L - Late</option>
                                                            <option value="N">N - No Show</option>
                                                            <option value="E">E - Early</option>
                                                            <option value="P">P - Pending Late</option>
                                                            <option value="C">C - Carry Over</option>
                                                            <option value="R">R - Reschedule</option>
                                                            <option value="D">D - Already Delivered</option>
                                                        </select>
                                                    </td>
                                                    )}
                                                    {full && (
                                                    <td
                                                        onClick={() => { if (can('stat')) handleStatChange(trl) }}
                                                        title={can('stat') ? undefined : why('stat')}
                                                        style={{
                                                            border: '1px solid #eee',
                                                            backgroundColor: getStatBackground(trl.stat),
                                                            textAlign: 'center',
                                                            cursor: can('stat') ? 'pointer' : 'not-allowed',
                                                            minWidth: '40px'
                                                        }}
                                                    >
                                                        {trl.stat || ' '}
                                                    </td>
                                                    )}
                                                    {/* Comment boxes are keyed by trailer: rows are keyed by
                                                        index, so a re-sort mustn't hand one trailer's draft to another */}
                                                    <td>
                                                        <NotesCell
                                                            key={trl.uuid}
                                                            value={trl.loadComments ?? ''}
                                                            onSave={text => saveComment(trl, 'loadComments', text)}
                                                            readOnly={!can('loadComments')}
                                                            readOnlyTitle={why('loadComments')}
                                                        />
                                                    </td>
                                                    <td style={{ backgroundColor: ryderOrange(trl) }}>
                                                        <NotesCell
                                                            key={trl.uuid}
                                                            background={ryderOrange(trl)}
                                                            value={trl.ryderComments ?? ''}
                                                            onSave={text => saveComment(trl, 'ryderComments', text)}
                                                            readOnly={!can('ryderComments')}
                                                            readOnlyTitle={why('ryderComments')}
                                                        />
                                                    </td>
                                                    <td>
                                                        {trl.gmComments?.length > 0 ?
                                                            <Allowed action="gmComments" dim={false}><a onClick={() => updateScreen(1, trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gmComments}
                                                            </a></Allowed>
                                                            :
                                                            <Allowed action="gmComments"><a onClick={() => updateScreen(1, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a></Allowed>
                                                        }
                                                    </td>
                                                    <td>
                                                        <NotesCell
                                                            key={trl.uuid}
                                                            value={trl.dockComments ?? ''}
                                                            onSave={text => saveComment(trl, 'dockComments', text)}
                                                            readOnly={!can('dockComments')}
                                                            readOnlyTitle={why('dockComments')}
                                                        />
                                                    </td>
                                                    {full && (
                                                    <td>
                                                        {trl.statusOX === 'P' ?
                                                            <Allowed action="status"><a onClick={() => handleStatusChange(trl, 'L', false)} className="btn btn-warning mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Confirm Late
                                                            </a></Allowed>
                                                            :
                                                            <></>
                                                        }
                                                    </td>
                                                    )}
                                                    {full && (
                                                    <td>
                                                        {trl.statusOX === 'P' ?
                                                            <Allowed action="status"><a onClick={() => handleStatusChange(trl, 'O', true)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Not Late
                                                            </a></Allowed>
                                                            :
                                                            <></>
                                                        }
                                                    </td>
                                                    )}
                                                </tr>
                                            )
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div
                    className='float-button'
                    onClick={() => { if (can('addOn')) setScreen(5) }}
                    title={can('addOn') ? undefined : why('addOn')}
                    style={can('addOn') ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
                >
                    +
                </div>
            </>
        )   
    }

    return (
        <>
            {router(screen)}
        </>
    )
}

export default LiveSheet