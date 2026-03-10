import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
//import { trailerApi } from '../../netlify/functions/trailerApi'
import { api } from '../utils/api'
import { lowestDoh } from '../signals/signals'

const IOSchedule = () => {

    const [io, setIo] = useState<any[]>([])
    const [ldoh] = useAtom(lowestDoh)
    const lowestDohAsMap = new Map(Object.entries(ldoh))
    const [screen, setScreen] = useState(0)

    const getLDoh = (parts: string[]) => {
        if (parts.length < 1) return undefined;
        
        let lowest: number | undefined;
        
        for (let i = 0; i < parts.length; i++) {
            const currentValue = lowestDohAsMap.get(parts[i]);
            
            if (currentValue === undefined) continue;
            
            if (lowest === undefined || currentValue < lowest) {
                lowest = currentValue;
            }
        }
        
        return lowest;
    }

    useEffect(() => {
        const fetchIoData = async () => {
            try {
                const res = await api.get<Array<{ Parts: string[] }>>('/api/get_io')
                
                const enriched = res.data
                    .map(item => ({
                        ...item,
                        lDoh: getLDoh(item.Parts)
                    }))
                    .sort((a, b) => {
                        // Handle undefined values (put them at the end)
                        if (a.lDoh === undefined && b.lDoh === undefined) return 0
                        if (a.lDoh === undefined) return 1
                        if (b.lDoh === undefined) return -1
                        return a.lDoh - b.lDoh
                    })
                
                setIo(enriched)
            } catch (error) {
                console.error('Failed to fetch IO data:', error)
            }
        }

        fetchIoData()
    }, [])

    const router = (screen: number) => {
        switch (screen) {
            case 0:
                return renderTable()
            case 1:
                return editEntry()
            default: break;
        }   
    }

    const editEntry = () => {

    }

    const renderTable = () => {
        return (
            <>
                <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100vh',
                        width: '100vw',
                        overflow: 'auto'
                    }}>
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
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Destination</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Original Schedule Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Sids</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Schedule Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Schedule Time</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Parts</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Lowest DoH</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            io?.map((trl: any, index: number) => {
                                                return (
                                                    <tr key={index} style={{backgroundColor: index % 2 !== 0 ? '#dddada' : '#fff'}}>
                                                        <td>{index + 1}</td>
                                                        <td>{trl.Trailer}</td>
                                                        <td>{trl.Schedule.Destination}</td>
                                                        <td>{trl.Schedule.OriginalDate}</td>
                                                        <td>
                                                            {trl.Sids.map((s: any, index: number) => {
                                                                return(
                                                                    <p key={`${index}-${s}-${trl.Trailer}`}>
                                                                        {s}
                                                                    </p>
                                                                )
                                                            })}
                                                        </td>
                                                        <td>{trl.Schedule.ScheduleDate}</td>
                                                        <td>{trl.Schedule.ScheduleTime}</td>
                                                        <td>
                                                            {trl.Parts.map((p: any, index: number) => {
                                                                return(
                                                                    <p key={`${index}-${p}-${trl.Trailer}`}>
                                                                        {p}
                                                                    </p>
                                                                )
                                                            })}
                                                        </td>
                                                        <td>
                                                            {trl.lDoh}
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
            {router(screen)}
        </>
    )
}

export default IOSchedule