import { useAtom } from "jotai";
import { allTrls as a, type TrailerRecord } from "../signals/signals";
import { api } from "../utils/api";
import { trailerApi } from "../../netlify/functions/trailerApi";
import { useEffect, useState } from "react";

const FinalVerification = () => {
    const [allTrls, setAllTrls] = useAtom(a)
    const [, setLoading] = useState(false)
    
    async function saveToDb() {
        try {
            const params = allTrls
            await api.post(`api/upload_next_shift`, params)
        } catch (error) {
            console.log(error)
        }
    }

    const setUuid = async () => {
        try {
            // Get the current count from database
            const { count } = await trailerApi.getTrailerCount();
            
            // Create a new array with updated UUIDs
            const updatedTrailers = allTrls.map((trailer) => ({
            ...trailer,
            uuid: count + trailer.uuid + 1  // Start from count + 1 and increment
            }));
            
            // Update your state with the new array
            setAllTrls(updatedTrailers);
            
            console.log('Updated UUIDs:', updatedTrailers);
            return updatedTrailers;
            
        } catch (error) {
            console.error('Failed to set UUIDs:', error);
            return [];
        }
    };

    useEffect(() => {
        (async () => {
            try {
                await setUuid()
            } catch (error) {
                console.log(error)
            }
        })()
    }, [])

    const pushTrailers = async (trailers: TrailerRecord[]) => {
            try {
                const res = await trailerApi.createTrailer(trailers)
                console.log(res)
            } catch (error) {
                console.log(error)
            } finally {
                setLoading(false)
            }
        }

    return (
        <>
            <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%'
                    }}>
                        <h1 style={{textAlign: 'center', marginTop: '5%'}}>Finalize</h1>
                        <a href="/" className="btn btn-secondary mt-3" style={{marginLeft: 'auto', marginRight: 'auto' }}>
                            Back to Landing
                        </a>
                        <a onClick={() => saveToDb()} className="btn btn-warning mt-3" style={{marginLeft: 'auto', marginRight: 'auto' }}>
                            Push to DB
                        </a>
                        <a onClick={() => pushTrailers(allTrls)} className="btn btn-warning mt-3" style={{marginLeft: 'auto', marginRight: 'auto' }}>
                            Push to DB
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
                                                        <td>{trl.scheduleStartDate}</td>
                                                        <td>{trl.adjustedStartTime}</td>
                                                        <td>{trl.scheduleEndDate}</td>
                                                        <td>{trl.scheduleEndTime}</td>
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