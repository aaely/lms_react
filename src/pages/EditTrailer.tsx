import { useEffect } from "react"
import { useAtom } from "jotai"
import { editedTrl as e, trailerForm as tfrm, editMode, allTrls as a } from "../signals/signals"
import { type TrailerForm, type TrailerRecord } from "../signals/signals"
//import { parse } from 'date-fns'
import TextField from '@mui/material/TextField'

const EditTrailer = () => {
        const [editedTrl] = useAtom(e)
        const [trailerForm, setTrailerForm] = useAtom<TrailerForm>(tfrm)
        const [edit, setEdit] = useAtom(editMode)
        const [, setAllTrls] = useAtom(a)

        const handleChange = ({target: { id, value}}: any) => {
            switch (id) {
                case 'planStartTime': {
                    let hour = value.split(':')[0]
                    let mins = value.split(':')[1]
                    setTrailerForm((prev: TrailerForm) => ({
                        ...prev,
                        [id]: value,
                        adjustedStartTime: value,
                        scheduleEndTime: hour > 23 ? '0' : `${parseInt(hour) + 1}:${mins}`,
                        hour
                    }));
                    break;
                }
                case 'adjustedStartTime': {
                    let hour = value.split(':')[0]
                    let mins = value.split(':')[1]
                    setTrailerForm((prev: TrailerForm) => ({
                        ...prev,
                        [id]: value,
                        planStartTime: value,
                        scheduleEndTime: hour > 23 ? '0' : `${parseInt(hour) + 1}:${mins}`,
                        hour
                    }));
                    break;
                }
                default: {
                    setTrailerForm((prev: TrailerForm) => ({
                        ...prev,
                        [id]: value
                    }));
                    break;
                }
            }
        }

        const update = () => {
            setAllTrls((prev: TrailerRecord[]) => 
                prev.map((trk: TrailerRecord) => 
                    trk.uuid === editedTrl.uuid 
                        ? { ...trk, ...trailerForm }  
                        : trk                          
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
                gmComments: editedTrl.gmComments || '',
                dateShift: editedTrl.dateShift || '',
                door: '',
                origin: '',
                lowestDoh: editedTrl.lowestDoh,
                loadComments: editedTrl.loadComments || ''
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
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="hour">Hour:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="hour" 
                                value={(trailerForm as any).hour} 
                                onChange={handleChange} 
                            />
                            </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="lmsAccent">LMS Accent:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="lmsAccent" 
                                value={(trailerForm as any).lmsAccent} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="dockCode">Dock Code:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="dockCode" 
                                value={(trailerForm as any).dockCode} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="acaType">ACA Type:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="acaType" 
                                value={(trailerForm as any).acaType} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="status">Status:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="status" 
                                value={(trailerForm as any).status} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="routeId">Route ID:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="routeId" 
                                value={(trailerForm as any).routeId} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="scac">SCAC:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="scac" 
                                value={(trailerForm as any).scac} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="trailer1">Trailer 1:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="trailer1" 
                                value={(trailerForm as any).trailer1} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="trailer2">Trailer 2:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="trailer2" 
                                value={(trailerForm as any).trailer2} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="firstSupplier">First Supplier:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="firstSupplier" 
                                value={(trailerForm as any).firstSupplier} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="dockStopSequence">Dock Stop Sequence:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="dockStopSequence" 
                                value={(trailerForm as any).dockStopSequence} 
                                onChange={handleChange} 
                            />
                        </div>

                            {/* Date/Time Fields */}
                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="planStartDate">Plan Start Date:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="planStartDate" 
                                value={(trailerForm as any).planStartDate} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="planStartTime">Plan Start Time:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="planStartTime" 
                                value={(trailerForm as any).planStartTime} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="scheduleStartDate">Schedule Start Date:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="scheduleStartDate" 
                                value={(trailerForm as any).scheduleStartDate} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="adjustedStartTime">Adjusted Start Time:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="adjustedStartTime" 
                                value={(trailerForm as any).adjustedStartTime} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="scheduleEndDate">Schedule End Date:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="scheduleEndDate" 
                                value={(trailerForm as any).scheduleEndDate} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="scheduleEndTime">Schedule End Time:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="scheduleEndTime" 
                                value={(trailerForm as any).scheduleEndTime} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="gateArrivalTime">Gate Arrival Time:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="gateArrivalTime" 
                                value={(trailerForm as any).gateArrivalTime} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="actualStartTime">Actual Start Time:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="actualStartTime" 
                                value={(trailerForm as any).actualStartTime} 
                                onChange={handleChange} 
                            />
                        </div>

                        <div>
                            <label style={{marginRight: '3%', textAlign: 'center'}} htmlFor="actualEndTime">Actual End Time:</label>
                            <TextField 
                                sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { textAlign: 'center' }
                                }}
                                variant='standard' 
                                id="actualEndTime" 
                                value={(trailerForm as any).actualEndTime} 
                                onChange={handleChange} 
                            />
                        </div>
                        
                        {/* Status & Comments */}
                        <div>
                        <label htmlFor="statusOX">Status OX:</label>
                        <select id="statusOX" value={(trailerForm as any).statusOX} onChange={handleChange}>
                            <option value="">Select</option>
                            <option value="O">O - On Time</option>
                            <option value="X">X - Exception</option>
                            <option value="L">L - Late</option>
                            <option value="N">N - No Show</option>
                            <option value="N">C - Carry Over</option>
                            <option value="N">R - Reschedule</option>
                        </select>
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="ryderComments">Ryder Comments:</label>
                        <TextField
                            id="ryderComments"
                            variant='standard'
                            sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { 
                                    textAlign: 'center'  // Targets the actual input element
                                }
                                }} 
                            value={(trailerForm as any).ryderComments} 
                            onChange={handleChange}
                            style={{ width: '70%' }}
                        />
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                        <label htmlFor="GMComments">GM Comments:</label>
                        <TextField 
                            id="GMComments"
                            variant='standard'
                            sx={{ 
                                marginLeft: '3%',
                                '& .MuiInputBase-input': { 
                                    textAlign: 'center'  // Targets the actual input element
                                }
                                }} 
                            value={(trailerForm as any).GMComments} 
                            onChange={handleChange}
                            style={{ width: '70%' }}
                        />
                        </div>
                        
                    </div> 
                    </form>
            </>
        )
    }

    export default EditTrailer