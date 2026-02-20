import { useState, useEffect } from 'react'
import { door as d, editedTrl as e, type TrailerRecord } from '../signals/signals'
import { useAtom } from 'jotai'
import { trailerApi } from '../../netlify/functions/trailerApi'
import { TextField } from '@mui/material'
import { api } from '../utils/api'

const LiveSheet = () => {
    const [trailers, setTrailers] = useState<TrailerRecord[]>([])
    const [filtered, setFiltered] = useState<TrailerRecord[]>([])
    const [editedTrl, setEdited] = useAtom<TrailerRecord>(e)
    const [door, setDoor] = useAtom(d)
    const [screen, setScreen] = useState('')
    const [currentDock, setCurrentDock] = useState('All')
    //const [shift, setShift] = useState('1st')

    const getBackground = (status: string) => {
        switch (status) {
            case 'O': {
                return 'green'
                }
            case 'R':{
                return 'gray'
                }
            case 'L':{
                return 'orange'
                }
            case 'N':{
                return 'red'
                }
            case 'C': {
                return 'pink'
            }
            default: return 'inherit'
        }
    }

    const filterByDock = (dock: string) => {
        switch (dock) {
            case 'A': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'BE': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'BW': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'BN': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'F': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'F1': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'V': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'U': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'P': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'D': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'plant': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode != 'U' && trl.dockCode != 'V' && trl.dockCode != 'Y'
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            default: {
                setFiltered(trailers)
                setCurrentDock('All')
            }
        }
    }

    const router = (screen: string) => {
        switch (screen) {
            case 'ryder': {
                return showRyderComments()
            }
            case 'gm': {
                return showGMComments()
            }
            case 'door': {
                return showSetDoor()
            }
            default: return showLiveSheet()
        }
    }

    const arrived = async (field: string, trailer: TrailerRecord, payload: string) => {
        const now = payload.length === 0 ? new Date(Date.now()).toLocaleTimeString() : ''
        console.log(now, field)
        switch (field) {
            case 'gate': {
                {try {
                    let updatedTrailer = { ...trailer, gateArrivalTime: now }
                    setFiltered((prev: TrailerRecord[]) => 
                        prev.map((t: TrailerRecord) => 
                            t.uuid === trailer.uuid ? updatedTrailer : t
                            )
                        );
                    await trailerApi.updateTrailer(trailer.uuid, updatedTrailer)
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            case 'start': {
                {try {
                    let updatedTrailer = payload.length > 0 ? { ...trailer, actualStartTime: '', door: '' } : { ...trailer, actualStartTime: now }
                    setFiltered((prev: TrailerRecord[]) => 
                        prev.map((t: TrailerRecord) => 
                            t.uuid === trailer.uuid ? updatedTrailer : t
                            )
                        );
                    await trailerApi.updateTrailer(trailer.uuid, updatedTrailer)
                    if ((updatedTrailer.dockCode === 'U' || updatedTrailer.dockCode === 'V') && updatedTrailer.actualStartTime !== '') {
                        setEdited(updatedTrailer)
                        setScreen('door')
                    }
                    break;
                } catch (error) {
                    console.log(error)
                    break;
                }}
            }
            case 'end': {
                {try {
                    let updatedTrailer = { ...trailer, actualEndTime: now }
                    setFiltered((prev: TrailerRecord[]) => 
                        prev.map((t: TrailerRecord) => 
                            t.uuid === trailer.uuid ? updatedTrailer : t
                            )
                        );
                    await trailerApi.updateTrailer(trailer.uuid, updatedTrailer)
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
                const trls = await trailerApi.getTrailers()
                console.log(trls.trailers)
                trls.trailers.sort((a: TrailerRecord, b: TrailerRecord) => {
                    // Convert to timestamps for reliable comparison
                    const dateA = new Date(`${a.scheduleStartDate} ${a.adjustedStartTime}`).getTime();
                    const dateB = new Date(`${b.scheduleStartDate} ${b.adjustedStartTime}`).getTime();
                    
                    // Compare by datetime first
                    if (dateA !== dateB) {
                        return dateA - dateB;
                    }
                    
                    // Same datetime - compare by time components
                    const [hoursA, minsA] = a.adjustedStartTime.split(':').map(Number);
                    const [hoursB, minsB] = b.adjustedStartTime.split(':').map(Number);
                    
                    if (hoursA !== hoursB) {
                        return hoursA - hoursB;
                    }
                    
                    if (minsA !== minsB) {
                        return minsA - minsB;
                    }
                    
                    // Finally compare by routeId as strings
                    return (a.routeId || '').localeCompare(b.routeId || '');
                });
                setTrailers(trls.trailers)
                setFiltered(trls.trailers)
            } catch (error) {
                console.log(error)
            }
        })()
    },[])

    const updateScreen = (s: string, trl: TrailerRecord) => {
        setEdited(trl)
        setScreen(s)
    }

    const showSetDoor = () => {
        const handleChange = ({target: { value}}: any) => {
            let updated = {...editedTrl, door: value}
            setDoor(value)
            setEdited(updated)
        }
        const setD = async () => {
            try {
                await trailerApi.updateTrailer(editedTrl.uuid, editedTrl)
                setScreen('')
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
            case 'A': return true;
            case 'plant': return true;
            case 'BE': return true;
            case 'BN': return true;
            case 'BW': return true;
            case 'F': return true;
            case 'F1': return true;
            case 'P': return true;
            case 'D': return true;
            default: return false;
        }
    }

    const showRyderComments = () => {
        const handleChange = ({target: { value}}: any) => {
            console.log(value)
            let updated = {...editedTrl, ryderComments: value}
            setEdited(updated)
        }
        const setComments = async () => {
            try {
                await trailerApi.updateTrailer(editedTrl.uuid, editedTrl)
                setFiltered((prev: TrailerRecord[]) => 
                        prev.map((t: TrailerRecord) => 
                            t.uuid === editedTrl.uuid ? editedTrl : t
                            )
                        );
                setScreen('')
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
            await api.post(`api/upload_next_shift`, trailers)
            await trailerApi.deleteLiveTrailers()
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
                await trailerApi.updateTrailer(editedTrl.uuid, editedTrl)
                setFiltered((prev: TrailerRecord[]) => 
                        prev.map((t: TrailerRecord) => 
                            t.uuid === editedTrl.uuid ? editedTrl : t
                            )
                        );
                setScreen('')
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

    const showLiveSheet = () => {

        const handleStatusChange = async (trailer: TrailerRecord, newValue: string) => {
            try {
                // Create updated trailer object
                const updatedTrailer = { 
                ...trailer, 
                statusOX: newValue 
                };
                
                // Update database
                await trailerApi.updateTrailer(trailer.uuid, updatedTrailer);
                
                // Also update filtered state if you have it
                setFiltered(prev => prev.map(t => 
                t.uuid === trailer.uuid ? updatedTrailer : t
                ));
                
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
                    <a href="/" className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Back to Landing
                    </a>
                    <h1 style={{ textAlign: 'center', marginTop: '5%' }}>Live Sheet</h1>
                    <a href="/nextShift" className="btn btn-primary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Next Shift
                    </a>
                    <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '90%',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                    }}>
                        <a href="/" className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Back to Landing
                        </a>
                        <a onClick={() => filterByDock('V')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            VAA
                        </a>
                        <a onClick={() => filterByDock('U')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Universal
                        </a>
                        <a onClick={() => filterByDock('plant')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Plant
                        </a>
                        <a onClick={() => filterByDock('')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            All
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
                                    width: '100%'
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
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer1</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer2</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>1st Supplier</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Dock Stop Sequence</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Plan Start Date</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Plan Start Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Gate Arrival Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Actual Start Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Actual End Time</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Status 0X</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Ryder Comments</th>
                                        <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>GM Comments</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        filtered?.map((trl: TrailerRecord, index: number) => {
                                            return (
                                                <tr key={index} style={{
                                                    borderBottom: '1px solid #eee', position: 'sticky',
                                                    backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff'
                                                }}>
                                                    <td style={{border: '1px solid #eee'}}>{index + 1}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.dateShift}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.hour}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.lmsAccent}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.dockCode}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.acaType}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.status}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.routeId}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.scac}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.trailer1}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.trailer2}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.firstSupplier}</td>
                                                    <td style={{border: '1px solid #eee'}}>{trl.dockStopSequence}</td>
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
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {trl.actualStartTime.length > 0 ?
                                                            <a onClick={() => arrived('start', trl, trl.actualStartTime)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualStartTime}
                                                            </a>
                                                            :
                                                            <a onClick={() => arrived('start', trl, trl.actualStartTime)} className='btn btn-secondary mt-3' style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Arrived
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
                                                                Arrived
                                                            </a>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee', backgroundColor: getBackground(trl.statusOX)}}>
                                                        <select 
                                                            id="statusOX" 
                                                            value={trl.statusOX || ''} 
                                                            onChange={(e) => handleStatusChange(trl, e.target.value)}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="O">O - On Time</option>
                                                            <option value="X">X - Exception</option>
                                                            <option value="L">L - Late</option>
                                                            <option value="N">N - No Show</option>
                                                            <option value="C">C - Carry Over</option>
                                                            <option value="R">R - Reschedule</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        {trl.ryderComments?.length > 0 ?
                                                            <a onClick={() => updateScreen('ryder', trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.ryderComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen('ryder', trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.gmComments?.length > 0 ?
                                                            <a onClick={() => updateScreen('gm', trl)} style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gmComments}
                                                            </a>
                                                            :
                                                            <a onClick={() => updateScreen('gm', trl)} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    }
                                </tbody>
                            </table>
                            <a onClick={() => rollShift()} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                Roll Shift
                            </a>
                        </div>
                    </div>
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