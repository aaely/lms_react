import { useState } from 'react'
import useInterval from '../utils/useInterval'
import { useAtom } from 'jotai'
import { trailerApi } from '../../netlify/functions/trailerApi'
import { user, type TrailerRecord } from '../signals/signals'

const ShiftOverview = () => {
    const [trailers, setTrailers] = useState<TrailerRecord[]>([])
    const [filtered, setFiltered] = useState<TrailerRecord[]>([])
    const [u, setUser] = useAtom(user)
    const [currentDock, setCurrentDock] = useState('All')
    
    const getTrls = async () => {
        try {
            const trls = await trailerApi.getTrailers(u.accessToken)
            setTrailers(trls.trailers)
        } catch (error) {
            console.log(error)
        }
    }

    useInterval(getTrls, 300000, true)

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

    const handleLogOut = () => {
        setUser({
            email: '',
            id: 0,
            accessToken: '',
            refreshToken: '',
            role: ''
        })
    }

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
                    <a onClick={() => handleLogOut()} className="btn btn-danger mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                            Logout
                    </a>
                </div>
                    <a href='/live'><h1 style={{textAlign: 'center'}}>Shift Overview</h1></a>
                    <h3 style={{textAlign: 'center'}}>Dock {currentDock}</h3>
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
                    <h3 style={{textAlign: 'center'}}>Total Expected: {filtered.length}</h3>
            </div>
        </>
    )
}

export default ShiftOverview