import { useEffect } from "react"
import { useAtom } from "jotai"
import { editedTrl as e, trailerForm as tfrm, editMode, allTrls as a } from "../signals/signals"
import { type TrailerForm, type TrailerRecord } from "../signals/signals"
//import { parse } from 'date-fns'

const EditTrailer = () => {
        const [editedTrl] = useAtom(e)
        const [trailerForm, setTrailerForm] = useAtom<TrailerForm>(tfrm)
        const [edit, setEdit] = useAtom(editMode)
        const [, setAllTrls] = useAtom(a)

        const handleChange = ({target: { id, value}}: any) => {
            setTrailerForm((prev: TrailerForm) => ({
                ...prev,
                [id]: value
            }));
            console.log(trailerForm)
        }

        const update = () => {
            setAllTrls((prev: TrailerRecord[]) => 
                prev.map((trk: TrailerRecord) => 
                    trk.uuid === editedTrl.uuid 
                        ? { ...trk, ...trailerForm }  // Update matching item
                        : trk                          // Keep others unchanged
                )
            )
            setEdit(!edit)
        }

        const handleEdit = () => {
            setEdit(!edit)
        }

        useEffect(() => {
            setTrailerForm({
                hour: editedTrl.hour || '',
                lmsAccent: editedTrl.lmsAccent || '',
                dockCode: editedTrl.dockCode || '',
                acaType: editedTrl.acaType || '',
                status: editedTrl.status || '',
                routeId: editedTrl.routeId || '',
                scac: editedTrl.scac || '',
                trailer1: editedTrl.trailer1 || '',
                trailer2: editedTrl.trailer2 || '',
                firstSupplier: editedTrl.firstSupplier || '',
                dockStopSequence: editedTrl.dockStopSequence || '',
                planStartDate: editedTrl.planStartDate || '',
                planStartTime: editedTrl.planStartTime || '',
                scheduleStartDate: editedTrl.scheduleStartDate || '',
                adjustedStartTime: editedTrl.adjustedStartTime || '',
                scheduleEndDate: editedTrl.scheduleEndDate || '',
                scheduleEndTime: editedTrl.scheduleEndTime || '',
                gateArrivalTime: editedTrl.gateArrivalTime || '',
                actualStartTime: editedTrl.actualStartTime || '',
                actualEndTime: editedTrl.actualEndTime || '',
                statusOX: editedTrl.statusOX || '',
                ryderComments: editedTrl.ryderComments || '',
                GMComments: editedTrl.GMComments || '',
                dateShift: editedTrl.dateShift || ''
            })
        }, [])

        return (
            <>
                <a onClick={() => handleEdit()} className="btn btn-warning mt-3">
                    Back
                </a>
                <a onClick={() => update()} className="btn btn-success mt-3">
                    Save
                </a>
                <form>
                    {/* Core Fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', padding: '20px' }}>
                        
                        <div>
                        <label htmlFor="hour">Hour:</label>
                        <input type="text" id="hour" value={(trailerForm as any).hour} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="lmsAccent">LMS Accent:</label>
                        <input type="text" id="lmsAccent" value={(trailerForm as any).lmsAccent} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="dockCode">Dock Code:</label>
                        <input type="text" id="dockCode" value={(trailerForm as any).dockCode} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="acaType">ACA Type:</label>
                        <input type="text" id="acaType" value={(trailerForm as any).acaType} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="status">Status:</label>
                        <input type="text" id="status" value={(trailerForm as any).status} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="routeId">Route ID:</label>
                        <input type="text" id="routeId" value={(trailerForm as any).routeId} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="scac">SCAC:</label>
                        <input type="text" id="scac" value={(trailerForm as any).scac} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="trailer1">Trailer 1:</label>
                        <input type="text" id="trailer1" value={(trailerForm as any).trailer1} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="trailer2">Trailer 2:</label>
                        <input type="text" id="trailer2" value={(trailerForm as any).trailer2} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="firstSupplier">First Supplier:</label>
                        <input type="text" id="firstSupplier" value={(trailerForm as any).firstSupplier} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="dockStopSequence">Dock Stop Sequence:</label>
                        <input type="text" id="dockStopSequence" value={(trailerForm as any).dockStopSequence} onChange={handleChange} />
                        </div>
                        
                        {/* Date/Time Fields */}
                        <div>
                        <label htmlFor="planStartDate">Plan Start Date:</label>
                        <input type="text" id="planStartDate" value={(trailerForm as any).planStartDate} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="planStartTime">Plan Start Time:</label>
                        <input type="text" id="planStartTime" value={(trailerForm as any).planStartTime} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="scheduleStartDate">Schedule Start Date:</label>
                        <input type="text" id="scheduleStartDate" value={(trailerForm as any).scheduleStartDate} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="adjustedStartTime">Adjusted Start Time:</label>
                        <input type="text" id="adjustedStartTime" value={(trailerForm as any).adjustedStartTime} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="scheduleEndDate">Schedule End Date:</label>
                        <input type="text" id="scheduleEndDate" value={(trailerForm as any).scheduleEndDate} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="scheduleEndTime">Schedule End Time:</label>
                        <input type="text" id="scheduleEndTime" value={(trailerForm as any).scheduleEndTime} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="gateArrivalTime">Gate Arrival Time:</label>
                        <input type="text" id="gateArrivalTime" value={(trailerForm as any).gateArrivalTime} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="actualStartTime">Actual Start Time:</label>
                        <input type="text" id="actualStartTime" value={(trailerForm as any).actualStartTime} onChange={handleChange} />
                        </div>
                        
                        <div>
                        <label htmlFor="actualEndTime">Actual End Time:</label>
                        <input type="text" id="actualEndTime" value={(trailerForm as any).actualEndTime} onChange={handleChange} />
                        </div>
                        
                        {/* Status & Comments */}
                        <div>
                        <label htmlFor="statusOX">Status OX:</label>
                        <select id="statusOX" value={(trailerForm as any).statusOX} onChange={handleChange}>
                            <option value="">Select</option>
                            <option value="O">O - On Time</option>
                            <option value="X">X - Exception</option>
                        </select>
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="ryderComments">Ryder Comments:</label>
                        <textarea 
                            id="ryderComments" 
                            value={(trailerForm as any).ryderComments} 
                            onChange={handleChange}
                            rows={3}
                            style={{ width: '100%' }}
                        />
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="GMComments">GM Comments:</label>
                        <textarea 
                            id="GMComments" 
                            value={(trailerForm as any).GMComments} 
                            onChange={handleChange}
                            rows={3}
                            style={{ width: '100%' }}
                        />
                        </div>
                        
                    </div> 
                    </form>
            </>
        )
    }

    export default EditTrailer