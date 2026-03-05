import { rescheduled, type TrailerRecord, tab } from "../signals/signals"
import { useAtom } from "jotai"

const Rescheduled = () => {

    const [rsch] = useAtom(rescheduled)
    const [, setTab] = useAtom(tab)
    return (
        <>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                width: '100%',
                overflow: 'auto'
            }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%' }}>Rescheduled Trailers</h1>
                <div style={{ padding: '20px', flex: 1, overflow: 'hidden' }}>                    
                    <div style={{ overflow: 'auto', height: '100%', position: 'relative'}}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto'}}>
                            <thead>
                                <tr style={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 20,
                                    background: 'white',
                                    width: '100%'
                                }}>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>#</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Date/Shift</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Hour</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Load #</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Dock Code</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Aca Type</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Status</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Route Id</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Scac</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Trailer1</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Trailer2</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>1st Supplier</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Dock Stop Sequence</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Schedule Start Date</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Adjusted Start Time</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    rsch.map((trl: TrailerRecord, index: number) => {
                                        return (
                                            <tr key={index} style={{
                                                borderBottom: '1px solid #eee',
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
                                                <td style={{border: '1px solid #eee'}}>{trl.ryderComments}</td>
                                            </tr>
                                        )
                                    })
                                }
                            </tbody>
                        </table>
                        <a style={{ marginLeft: 'auto', marginRight: 'auto' }} onClick={() => setTab(prevTab => prevTab + 1)} className="btn btn-secondary mt-3">
                            Next
                        </a>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Rescheduled