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

    useEffect(() => {
        const a = allTrls?.filter(a => a.origin !== 'carryover')
        if (a.length > 0) {
            setAllTrls(a)
        }
    },[allTrls])

    const setUuid = async (trailers: TrailerRecord[]) => {
        try {
                // Get the current max UUID from database
                const { count } = await trailerApi.getTrailerCount();
                console.log('Current max UUID in DB:', count);
                
                // Start from count + 1
                const startUuid = count + 1;
                console.log('Start UUID:', startUuid);
                // Create a new array with sequential UUIDs
                const updatedTrailers = trailers.map((trailer) => {
                
                return {
                    ...trailer,
                    uuid: trailer.uuid + startUuid
                };
            });
            
            return updatedTrailers;
            
        } catch (error) {
            console.error('Failed to set UUIDs:', error);
            return [];
        }
    };

    const pushTrailers = async (trailers: TrailerRecord[]) => {
        try {
            const updated = await setUuid(trailers)
            const res = await trailerApi.pushOnDeck(updated)
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
                height: '100vh',
                width: '100%',
                overflow: 'auto'
            }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%' }}>Finalize</h1>
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
                    <a onClick={() => saveToDb()} className="btn btn-warning mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Push to DB
                    </a>
                    <a onClick={() => pushTrailers(allTrls)} className="btn btn-warning mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                        Push to DB
                    </a>
                </div>
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
                                    allTrls.map((trl: TrailerRecord, index: number) => {
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
                    </div>
                </div>
            </div>
        </>
    )
}

export default FinalVerification