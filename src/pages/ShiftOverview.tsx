import { useState, useEffect } from 'react'
import useInterval from '../utils/useInterval'
import { type TrailerRecord } from '../signals/signals'
import { isDetention, filterTrailersByDock, isPlantDockView } from '../utils/helpers'
import { api, logout as handleLogOut } from '../utils/api'

const ShiftOverview = () => {
    const [trailers, setTrailers] = useState<TrailerRecord[]>([])
    const [filtered, setFiltered] = useState<TrailerRecord[]>([])
    const [currentDock, setCurrentDock] = useState('All')

    const getTrls = async () => {
        try {
            const trls = await api.get('/api/get_live_trailers')
            setTrailers(trls.data)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const trls = await api.get('/api/get_live_trailers')
            setTrailers(trls.data)
            } catch (error) {
                console.log(error)
            }
        })()
    }, [])

    useInterval(getTrls, 300000, true)

    const filterByDock = (dock: string) => {
        setFiltered(filterTrailersByDock(trailers, dock))
        setCurrentDock(dock || 'All')
    }

    const getTotals = () => {
        let [arrived, late, detention, carryover, pending, reschedule] = [0, 0, 0, 0, 0, 0]
        filtered.forEach(a => {
            if (a.gateArrivalTime && a.gateArrivalTime !== '') {
                arrived++
            }
            if (a.statusOX === 'L') late++
            if (isDetention(a)[0]) detention++
            if (a.statusOX === 'C') carryover++
            if (a.actualStartTime && a.actualStartTime !== '') pending++
            if (a.statusOX === 'R') reschedule++
        })
        return [arrived, late, detention, carryover, pending, reschedule]
    }

    return (
        <>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                width: '100vw',
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
                <a href='/live'><h1 style={{ textAlign: 'center' }}>Shift Overview</h1></a>
                <h3 style={{ textAlign: 'center' }}>Dock {currentDock}</h3>
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
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Expected: {filtered.length}</h3>
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Arrived: {getTotals()[0]}</h3>
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Late: {getTotals()[1]}</h3>
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Detention: {getTotals()[2]}</h3>
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Carryovers: {getTotals()[3]}</h3>
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Pending Finish: {getTotals()[4]}</h3>
                <h3 style={{ textAlign: 'center', marginTop: '3%' }}>Total Reschedules: {getTotals()[5]}</h3>
            </div>
        </>
    )
}

export default ShiftOverview