import { useAtom } from "jotai";
import { allTrls as a, type TrailerRecord, rescheduled } from "../signals/signals";
import { api } from "../utils/api";
import { useState } from "react";
import * as XLSX from 'xlsx'

const FinalVerification = () => {
    const [allTrls] = useAtom(a)
    const [, setLoading] = useState(false)
    const [, setRsch] = useAtom(rescheduled)

    const downloadUVDocks = (trailers: TrailerRecord[]) => {
        const filtered = trailers.filter(t => t.dockCode === 'U' || t.dockCode === 'V')
        if (filtered.length === 0) return

        const headers = ['Date Shift', 'Hour', 'Dock', 'Door', 'Status', 'Route', 'SCAC', 'Trailer 1', 'Supplier', 'Dock Stop Seq', 'Plan Start Date', 'Plan Start Time', 'Sched Start Date', 'Adj Start Time', 'Sched End Date', 'Sched End Time', 'Gate Arrival Time', 'Actual Window Time', 'Actual Start Time', 'Actual End Time', 'Status OX', 'Ryder Comments', 'GM Comments']

        const rows = filtered.map(t => [
            t.dateShift,
            t.hour,
            t.dockCode,
            '',
            t.status,
            t.routeId,
            t.scac,
            t.trailer1,
            t.firstSupplier,
            t.dockStopSequence,
            t.planStartDate,
            t.planStartTime,
            t.scheduleStartDate,
            t.adjustedStartTime,
            t.scheduleEndDate,
            t.scheduleEndTime,
            '',
            '',
            '',
            '',
            t.statusOX,
            t.loadComments,
            ''
        ])

        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'U-V Docks')
        XLSX.writeFile(wb, `uv_docks_${filtered[0].dateShift}.xlsx`)
    }

    const pushTrailers = async (trailers: TrailerRecord[]) => {
        try {
            downloadUVDocks(trailers)
            const t = trailers.map(a => ({
                ...a,
                hour: `${a.hour}`,
                lmsAccent: `${a.lmsAccent}`,
                lowestDoh: `${a.lowestDoh}`
            }))
            await api.post('/api/upload_on_deck', t)
            setRsch([])
            window.location.href = '/nextShift'
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
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Ryder Comments</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>GM Comments</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'relative' }}>Load Comments</th>
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
                                                <td style={{border: '1px solid #eee'}}>{trl.gmComments}</td>
                                                <td style={{border: '1px solid #eee'}}>{trl.loadComments}</td>
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