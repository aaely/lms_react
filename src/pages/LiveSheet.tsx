import { useEffect, useState } from 'react'
import { door as d,
         editedTrl as e,
         type TrailerRecord,
         user as u,
         liveScreen,
         liveTrailers,
         filteredTrailers} from '../signals/signals'
import { useAtom } from 'jotai'
import { TextField } from '@mui/material'
import { api } from '../utils/api'
import { isDetention, getBackground, formatDetentionTime } from '../utils/helpers'
import '../App.css'
import LiveAddOn from './LiveAddOn'
import useInterval from '../utils/useInterval'

const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/DUMMY_APP_ID/DUMMY_CHANNEL_ID/DUMMY_TOKEN"
const PLANT_DOCKS = new Set(['A', 'BE', 'BN', 'BW', 'D', 'E', 'F', 'F1', 'P', 'V', 'U'])

const LiveSheet = () => {
    const [trailers, setTrailers] = useAtom<TrailerRecord[]>(liveTrailers)
    const [filtered, setFiltered] = useAtom<TrailerRecord[]>(filteredTrailers)
    const [editedTrl, setEdited] = useAtom<TrailerRecord>(e)
    const [door, setDoor] = useAtom(d)
    const [trailer1, setTrailer1] = useState('')
    const [screen, setScreen] = useAtom(liveScreen)
    const [currentDock, setCurrentDock] = useState('All')
    const [user] = useAtom(u)
    const [shift, setShift] = useState('')

    useInterval(() => { setFiltered(prev => [...prev]) }, 60000)

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
            case 3: {
                return showDockComments()
            }
            case 4: {
                return showLateComments()
            }
            case 5 :
                return <LiveAddOn />
            case 6:
                return showRyderComments()
            case 7:
                return setTrailer()
            case 8:
                return showLegend()
            default: showLiveSheet()
        }
    }
    

    const arrived = async (field: string, trailer: TrailerRecord, payload: string) => {
        console.log(payload)
        const now = (payload?.length === 0 || payload === undefined) ? new Date(Date.now()).toLocaleTimeString() : ''
        const date = (payload?.length === 0 || payload === undefined) ? new Date(Date.now()).toLocaleDateString('en-CA') : ''
        switch (field) {
            case 'gate': {
                {try {
                    let a = new Date(Date.now()).getTime()
                    let b = new Date(`${trailer.scheduleStartDate} ${trailer.adjustedStartTime}`).getTime()
                    let c = b + (1000 * 60 * 15)
                    let d = b - (1000 * 60 * 15)
                    let updatedTrailer = { ...trailer, gateArrivalTime: now, gateArrivalDate: date, statusOX: payload.length > 0 ? '' : a < d ? 'E' : a > c ? 'L' : 'O' }
                    const gateRes = await api.post('/api/update_live_trailer', updatedTrailer)
                    const gateSaved = gateRes.data as TrailerRecord
                    setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === gateSaved.uuid ? gateSaved : t
                            )
                        );
                    await sendSlackNotification(gateSaved, 'E')
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            case 'door': {
                {try {
                    let updatedTrailer = payload?.length > 0 ? { ...trailer, doorArrivalTime: '', door: '' } : { ...trailer, doorArrivalTime: now, actualArrivalDate: date }
                    const doorRes = await api.post('/api/update_live_trailer', updatedTrailer)
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
                    let updatedTrailer = payload.length > 0 ? { ...trailer, actualStartTime: '' } : { ...trailer, actualStartTime: now, actualArrivalDate: date }
                    const startRes = await api.post('/api/update_live_trailer', updatedTrailer)
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
                    const endRes = await api.post('/api/update_live_trailer', updatedTrailer)
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
                trls.data.sort((a: TrailerRecord, b: TrailerRecord) => {
                    const dateA = new Date(`${a.scheduleStartDate} ${a.adjustedStartTime}`).getTime();
                    const dateB = new Date(`${b.scheduleStartDate} ${b.adjustedStartTime}`).getTime();
                    
                    if (dateA !== dateB) {
                        return dateA - dateB;
                    }
                    
                    const [hoursA, minsA] = a.adjustedStartTime.split(':').map(Number);
                    const [hoursB, minsB] = b.adjustedStartTime.split(':').map(Number);
                    
                    if (hoursA !== hoursB) {
                        return hoursA - hoursB;
                    }
                    
                    if (minsA !== minsB) {
                        return minsA - minsB;
                    }
                    
                    return (a.routeId || '').localeCompare(b.routeId || '');
                });
                const t = trls.data.filter((a: any) => a.origin !== 'carryover')
                if (t.length === 0) {setShift('N/A')} else {setShift(getShift(t[0]?.adjustedStartTime || '1st'))}
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

    const updateScreen = (s: number, trl: TrailerRecord) => {
        setEdited(trl)
        setScreen(s)
    }

    const setTrailer = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, trailer1: value}
            setTrailer1(value)
            setEdited(updated)
        }
        const setT = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const trlRes = await api.post('/api/update_live_trailer', updatedTrailer)
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
                const doorSetRes = await api.post('/api/update_live_trailer', updatedTrailer)
                const doorSetSaved = doorSetRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === doorSetSaved.uuid ? doorSetSaved : t
                            )
                        );
                await sendSlackNotification(doorSetSaved, 'D')
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

    const plantDocks = (dock: string) => {
        switch (dock) {
            case 'A':     return true;
            case 'plant': return true;
            case 'BE':    return true;
            case 'BN':    return true;
            case 'BW':    return true;
            case 'F':     return true;
            case 'E':     return true;
            case 'F1':    return true;
            case 'P':     return true;
            case 'D':     return true;
            default:      return false;
        }
    }

    const showRyderComments = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, ryderComments: value}
            setEdited(updated)
        }
        const setComments = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const ryderRes = await api.post('/api/update_live_trailer', updatedTrailer)
                const ryderSaved = ryderRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === ryderSaved.uuid ? ryderSaved : t
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
                <h1 style={{ textAlign: 'center', marginTop: '5%'}}>Set Ryder Comments</h1>
                <h4 style={{ textAlign: 'center', marginTop: '5%'}}>Trailer: {editedTrl?.trailer1} SCAC: {editedTrl?.scac} Route: {editedTrl?.routeId} </h4>
                <TextField  sx={{ marginLeft: '3%', '& .MuiInputBase-input': { textAlign: 'center' }}} variant='standard' id='door' value={editedTrl?.ryderComments} onChange={handleChange} />
                { editedTrl &&
                    <a onClick={() => setComments()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Set Comments
                    </a>
                }
            </div>
            </>
        )
    }

    const rollShift = async () => {
        try {
            if (user.role !== 'admin' && user.role !== 'supervisor') {
                return
            }
            let op = trailers[0]?.scheduleStartDate ?? '2026-03-24'
            let op_date = op.split('-')
            let operational_date = `${op_date[0]}-${op_date[1]}-${op_date[2]}`
            await api.post(`api/roll_next_shift`, { operational_date })
            window.location.reload()
        } catch (error) {
            console.log(error)
        }
    }

    const showGMComments = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, gmComments: value}
            setEdited(updated)
        }
        const setComments = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const gmRes = await api.post('/api/update_live_trailer', updatedTrailer)
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

    const showDockComments = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, dockComments: value}
            setEdited(updated)
        }
        const setComments = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const dockRes = await api.post('/api/update_live_trailer', updatedTrailer)
                const dockSaved = dockRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === dockSaved.uuid ? dockSaved : t
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
                <h1 style={{ textAlign: 'center', marginTop: '5%'}}>Set Dock Comments</h1>
                <h4 style={{ textAlign: 'center', marginTop: '5%'}}>Trailer: {editedTrl?.trailer1} SCAC: {editedTrl?.scac} Route: {editedTrl?.routeId} </h4>
                <TextField  sx={{ marginLeft: '3%', '& .MuiInputBase-input': { textAlign: 'center' }}} variant='standard' id='door' value={editedTrl?.dockComments} onChange={handleChange} />
                { editedTrl &&
                    <a onClick={() => setComments()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Set Comments
                    </a>
                }
            </div>
            </>
        )
    }

    const showLateComments = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, lateComments: value}
            setEdited(updated)
        }
        const setComments = async () => {
            try {
                const updatedTrailer = { ...editedTrl }
                const lateRes = await api.post('/api/update_live_trailer', updatedTrailer)
                const lateSaved = lateRes.data as TrailerRecord
                setFiltered((prev: TrailerRecord[]) =>
                        prev.map((t: TrailerRecord) =>
                            t.uuid === lateSaved.uuid ? lateSaved : t
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
                <h1 style={{ textAlign: 'center', marginTop: '5%'}}>Set Late Comments</h1>
                <h4 style={{ textAlign: 'center', marginTop: '5%'}}>Trailer: {editedTrl?.trailer1} SCAC: {editedTrl?.scac} Route: {editedTrl?.routeId} </h4>
                <TextField  sx={{ marginLeft: '3%', '& .MuiInputBase-input': { textAlign: 'center' }}} variant='standard' id='door' value={editedTrl?.lateComments} onChange={handleChange} />
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
                        animation: 'flash-detention 2s ease-in-out infinite',
                    }} />
                    <div>
                        <strong>Detention Risk (flashing)</strong>
                        <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                            The trailer arrived at the gate but has not been worked for more than 60 minutes
                            past its scheduled start time. The detention clock is running — the time
                            shown is how long it has been sitting.
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
        if (trl.statusOX === 'P') return 'orange'
        if (trl.acaType.toLowerCase().includes('add')) return 'fushia'
        if (trl.statusOX === 'R') return 'gray'
        return index % 2 === 0 ? '#cac8c8' : '#fff'
    }

    const sendSlackNotification = async (trl: TrailerRecord, newStatus: string) => {
        const base = `Load: ${trl.lmsAccent} | Route: ${trl.routeId} | SCAC: ${trl.scac} | Trailer: ${trl.trailer1} | Dock: ${trl.dockCode}`

        let text = ''
        switch (newStatus) {
            case 'R':
                text = `:arrows_counterclockwise: *Rescheduled*\n${base} | New Date: ${trl.scheduleStartDate} | New Time: ${trl.adjustedStartTime}`
                break
            case 'O':
                text = `:red_circle: *On Time*\n${base} | Scheduled: ${trl.scheduleStartDate} @ ${trl.adjustedStartTime}`
                break
            case 'E':
                text = `:white_check_mark: *Trailer Arrived*\n${base} | Gate Arrival: ${trl.gateArrivalTime}`
                break
            case 'N':
                text = `:x: *No Show*\n${base} | Scheduled: ${trl.scheduleStartDate} @ ${trl.adjustedStartTime}`
                break
            case 'L':
            default:
                return
        }

        try {
            await fetch(SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            })
        } catch (error) {
            console.error('Slack notification failed:', error)
        }
    }

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
                const statusRes = await api.post('/api/update_live_trailer', updatedTrailer)
                const statusSaved = statusRes.data as TrailerRecord

                setFiltered(prev => prev.map(t =>
                    t.uuid === statusSaved.uuid ? statusSaved : t
                ));

                await sendSlackNotification(statusSaved, newValue)

                if (!updateTime && newValue === 'L') {
                    setEdited(statusSaved)
                    setScreen(4)
                }
                
            } catch (error) {
                console.error('Failed to update status:', error);
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
                        <a onClick={() => filterByDock('V')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            VAA
                        </a>
                        <a onClick={() => filterByDock('U')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Universal
                        </a>
                        <a onClick={() => filterByDock('plant')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Plant
                        </a>
                        <a onClick={() => filterByDock('All')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            All
                        </a>
                        <a onClick={() => setScreen(8)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Legend
                        </a>
                        <a onClick={() => rollShift()} className="btn btn-danger mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Roll Shift
                        </a>
                    </div>
                    {
                        plantDocks(currentDock) &&
                        <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '90%',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                        }}>
                            <a onClick={() => filterByDock('A')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                A
                            </a>
                            <a onClick={() => filterByDock('BE')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                BE
                            </a>
                            <a onClick={() => filterByDock('BN')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                BN
                            </a>
                            <a onClick={() => filterByDock('BW')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                BW
                            </a>
                            <a onClick={() => filterByDock('D')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                D
                            </a>
                            <a onClick={() => filterByDock('E')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                E
                            </a>
                            <a onClick={() => filterByDock('F')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                F
                            </a>
                            <a onClick={() => filterByDock('F1')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                F1
                            </a>
                            <a onClick={() => filterByDock('P')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                P
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
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>#</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Date/Shift</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Hour</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Load #</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Code</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Aca Type</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Status</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Route Id</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Scac</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>DOH</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer1</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer2</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Door</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>1st Supplier</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Stop Sequence</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Plan Start Date</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Plan Start Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Gate Arrival Time</th>
                                        {   (currentDock === 'U' || currentDock === 'V') &&
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Door Arrival Time</th>
                                        }
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Start Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock End Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Status 0X</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Load Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Ryder Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>GM Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Late Comments</th>
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
                                                    className={isDetention(trl)[0] ? 'detention-flash' : ''}
                                                >
                                                    <td style={{border: '1px solid #eee'}}>{index + 1}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.dateShift}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.hour}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.lmsAccent}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.dockCode}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.acaType}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.status}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.routeId}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.scac}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.lowestDoh}</td>
                                                    {
                                                        trl.trailer1.length > 0 ?
                                                        <td style={{border: '1px solid #eee'}}><a onClick={() => updateScreen(7, trl)}>{trl.trailer1}</a></td>
                                                        :
                                                        <td style={{border: '1px solid #eee'}}><a onClick={() => updateScreen(7, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>Set Trailer</a></td>
                                                    }
                                                    <td style={{border: '1px solid #eee'}}>{trl.trailer2}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.door}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.firstSupplier}</td>
                                                    <td style={{border: '1px solid #eee'}}>{
                                                        isDetention(trl)[0] ?
                                                            formatDetentionTime(isDetention(trl)[1])
                                                            :
                                                            trl.dockStopSequence
                                                        }</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.scheduleStartDate}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.adjustedStartTime}</td>
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {trl.gateArrivalTime.length === 0 ?
                                                            <a onClick={() => arrived('gate', trl, trl.gateArrivalTime)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Arrived
                                                            </a>
                                                            :
                                                            <a onClick={() => arrived('gate', trl, trl.gateArrivalTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gateArrivalTime}
                                                            </a>
                                                        }
                                                    </td>
                                                    {
                                                        (currentDock === 'U' || currentDock === 'V') &&
                                                        <td style={{border: '1px solid #eee'}}>
                                                            {(trl.doorArrivalTime?.length === 0 || trl.doorArrivalTime === undefined) ?
                                                                <a onClick={() => arrived('door', trl, trl.doorArrivalTime)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    Arrived
                                                                </a>
                                                                :
                                                                <a onClick={() => arrived('door', trl, trl.doorArrivalTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    {trl.doorArrivalTime}
                                                                </a>
                                                            }
                                                        </td>
                                                    }
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {trl.actualStartTime.length > 0 ?
                                                            <a onClick={() => arrived('start', trl, trl.actualStartTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualStartTime}
                                                            </a>
                                                            :
                                                            <a onClick={() => arrived('start', trl, trl.actualStartTime)} className='btn btn-secondary mt-3' style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Unload
                                                            </a>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {trl.actualEndTime.length > 0 ?
                                                            <a onClick={() => arrived('end', trl, trl.actualEndTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualEndTime}
                                                            </a>
                                                            :
                                                            <a onClick={() => arrived('end', trl, trl.actualEndTime)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Empty
                                                            </a>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee', backgroundColor: getBackground(trl.statusOX)}}>
                                                        <select 
                                                            id="statusOX" 
                                                            value={trl.statusOX || ''} 
                                                            onChange={(e) => handleStatusChange(trl, e.target.value, false)}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="O">O - On Time</option>
                                                            <option value="L">L - Late</option>
                                                            <option value="N">N - No Show</option>
                                                            <option value="E">E - Early</option>
                                                            <option value="A">A - Add On</option>
                                                            <option value="P">P - Pending Late</option>
                                                            <option value="C">C - Carry Over</option>
                                                            <option value="R">R - Reschedule</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        {trl.loadComments?.length > 0 ?
                                                            <a onClick={() => updateScreen(6, trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.loadComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen(6, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.ryderComments?.length > 0 ?
                                                            <a onClick={() => updateScreen(6, trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.ryderComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen(6, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.gmComments?.length > 0 ?
                                                            <a onClick={() => updateScreen(1, trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gmComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen(1, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.dockComments?.length > 0 ?
                                                            <a onClick={() => updateScreen(3, trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.dockComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen(3, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Dock Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.lateComments?.length > 0 ?
                                                            <a onClick={() => updateScreen(4, trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.lateComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen(4, trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Late Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.statusOX === 'P' ?
                                                            <a onClick={() => handleStatusChange(trl, 'L', false)} className="btn btn-warning mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Confirm Late
                                                            </a>
                                                            :
                                                            <></>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.statusOX === 'P' ?
                                                            <a onClick={() => handleStatusChange(trl, 'O', true)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Not Late
                                                            </a>
                                                            :
                                                            <></>
                                                        }
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className='float-button' onClick={() => setScreen(5)}>
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