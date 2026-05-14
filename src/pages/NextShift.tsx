import { useEffect, useState } from 'react'
import { type TrailerRecord, 
         user as u, 
         liveTrailers,
         filteredTrailers } from '../signals/signals'
import { useAtom } from 'jotai'
import { api } from '../utils/api'
import { isDetention, getBackground, formatDetentionTime } from '../utils/helpers'
import '../App.css'


const LiveSheet = () => {
    const [trailers, setTrailers] = useAtom<TrailerRecord[]>(liveTrailers)
    const [filtered, setFiltered] = useAtom<TrailerRecord[]>(filteredTrailers)
    const [currentDock, setCurrentDock] = useState('All')
    const [, setUser] = useAtom(u)
    const [shift, setShift] = useState('')

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
            case 'E': {
                const filter = trailers.filter((trl: TrailerRecord) => {
                    return trl.dockCode == dock
                })
                setFiltered(filter)
                setCurrentDock(dock)
                break;
            }
            case 'Y': {
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

    const handleLogOut = () => {
        setUser({
            email: '',
            accessToken: '',
            refreshToken: '',
            role: ''
        })
    }

    useEffect(() => {
        (async () => {
            try {
                const trls = await api.get('/api/get_staged_trailers')
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
        console.log(t)
        let hrs = parseInt(t.split(':')[0])
        if (hrs >= 6 && hrs < 14) return '1st'
        if (hrs >= 14 && hrs < 22) return '2nd'
        return '3rd'
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

    const getBgc = (trl: TrailerRecord, index: number) => {
        if (trl.statusOX === 'P') return 'orange'
        if (trl.gateArrivalTime.length > 0) return 'yellow'
        return index % 2 === 0 ? '#cac8c8' : '#fff'
    }

    const showLiveSheet = () => {

        return (
            <>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    width: '100%',
                    overflow: 'auto'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '100%',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>   
                        <a href="/" className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                Back to Landing
                        </a>
                        <a href="/live" className="btn btn-primary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Live Sheet
                        </a>
                        <a onClick={() => handleLogOut()} className="btn btn-danger mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                Logout
                        </a>
                    </div>
                    <a><h1 style={{ textAlign: 'center', marginTop: '1%' }}>Next Shift</h1></a>
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
                        <a onClick={() => filterByDock('')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            All
                        </a>
                        <a onClick={() => filterByDock('Y')} className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Dropyard
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
                                                    <td style={{border: '1px solid #eee'}}>{trl.trailer1}</td>
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
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Arrived
                                                            </a>
                                                            :
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gateArrivalTime}
                                                            </a>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {trl.actualStartTime.length > 0 ?
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualStartTime}
                                                            </a>
                                                            :
                                                            <a className='btn btn-secondary mt-3' style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Unload
                                                            </a>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee'}}>
                                                        {trl.actualEndTime.length > 0 ?
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.actualEndTime}
                                                            </a>
                                                            :
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Empty
                                                            </a>
                                                        }
                                                    </td>
                                                    <td style={{border: '1px solid #eee', backgroundColor: getBackground(trl.statusOX)}}>
                                                        <select 
                                                            id="statusOX" 
                                                            value={trl.statusOX || ''} 
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
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.loadComments}
                                                            </a>
                                                            :
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.ryderComments?.length > 0 ?
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.ryderComments}
                                                            </a>
                                                            :
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.gmComments?.length > 0 ?
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.gmComments}
                                                            </a>
                                                            :
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.dockComments?.length > 0 ?
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.dockComments}
                                                            </a>
                                                            :
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Dock Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.lateComments?.length > 0 ?
                                                            <a style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                {trl.lateComments}
                                                            </a>
                                                            :
                                                            <a className="btn btn-secondary mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Late Comments
                                                            </a>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.statusOX === 'P' ?
                                                            <a className="btn btn-warning mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Confirm Late
                                                            </a>
                                                            :
                                                            <></>
                                                        }
                                                    </td>
                                                    <td>
                                                        {trl.statusOX === 'P' ?
                                                            <a className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
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
            </>
        )   
    }

    return (
        <>
            {showLiveSheet()}
        </>
    )
}

export default LiveSheet