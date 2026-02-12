import { useAtom } from "jotai";
import { allTrls as a, type TrailerRecord } from "../signals/signals";


const FinalVerification = () => {
    const [allTrls] = useAtom(a)

    return (
        <>
            <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        <h1 style={{textAlign: 'center', marginTop: '5%'}}>Finalize</h1>
                        <a href="/" className="btn btn-secondary mt-3">
                            Back to Landing
                        </a>
                        <div style={{ padding: '20px' }}>
                            {/* Dock Tabs */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid #ddd',
                                marginBottom: '20px',
                                flexWrap: 'wrap',
                                width: '100%'
                            }}>
                            </div>
                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                    <tr>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>#</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Date/Shift</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Hour</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Load #</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Code</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Aca Type</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Status</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Route Id</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Scac</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer1</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer2</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>1st Supplier</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Stop Sequence</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Date</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Time</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule Start Date</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Adjusted Start Time</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Date</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Time</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Comments</th>
                                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Max Per Hour</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            allTrls.map((trl: TrailerRecord, index: number) => {
                                                return (
                                                    <tr key={index} style={{
                                                        borderBottom: '1px solid #eee', position: 'sticky', 
                                                        backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff'
                                                        }}>
                                                        <td>{index + 1}</td>
                                                        <td>{trl.dateShift}</td>
                                                        <td>{trl.hour}</td>
                                                        <td>{trl.lmsAccent}</td>
                                                        <td>{trl.dockCode}</td>
                                                        <td>{trl.acaType}</td>
                                                        <td>{trl.status}</td>
                                                        <td>{trl.routeId}</td>
                                                        <td>{trl.scac}</td>
                                                        <td>{trl.trailer1}</td>
                                                        <td>{trl.trailer2}</td>
                                                        <td>{trl.firstSupplier}</td>
                                                        <td>{trl.dockStopSequence}</td>
                                                        <td>{new Date(trl.scheduleStartDate).toLocaleDateString('en-US', {
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    year: 'numeric'
                                                                    })    }</td>
                                                        <td>{new Date(trl.adjustedStartTime).toLocaleTimeString()}</td>
                                                        <td>{new Date(trl.scheduleEndDate).toLocaleDateString('en-US', {
                                                                    month: '2-digit',
                                                                    day: '2-digit',
                                                                    year: 'numeric'
                                                                    })    }</td>
                                                        <td>{new Date(trl.scheduleEndTime).toLocaleTimeString()}</td>
                                                        <td>{trl.GMComments}</td>
                                                        <td>{trl.ryderComments}</td>
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

export default FinalVerification