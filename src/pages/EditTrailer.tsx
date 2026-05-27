import { useEffect } from "react"
import { useAtom } from "jotai"
import { editedTrl as e, trailerForm as tfrm, editMode, allTrls as a } from "../signals/signals"
import { type TrailerForm, type TrailerRecord } from "../signals/signals"
import {
    Box,
    Button,
    Divider,
    Grid,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material"

const STATUS_OX_OPTIONS = [
    { value: 'O', label: 'O - On Time' },
    { value: 'X', label: 'X - Exception' },
    { value: 'A', label: 'A - Add On' },
    { value: 'L', label: 'L - Late' },
    { value: 'N', label: 'N - No Show' },
    { value: 'C', label: 'C - Carry Over' },
    { value: 'R', label: 'R - Reschedule' },
]

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
)

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />

const EditTrailer = () => {
    const [editedTrl] = useAtom(e)
    const [trailerForm, setTrailerForm] = useAtom<TrailerForm>(tfrm)
    const [edit, setEdit] = useAtom(editMode)
    const [, setAllTrls] = useAtom(a)

    const handleChange = ({ target: { id, value } }: any) => {
        switch (id) {
            case 'adjustedStartTime': {
                const [hour, mins] = value.split(':')
                const h = parseInt(hour)
                const overMidnight = h >= 23
                setTrailerForm((prev: TrailerForm) => {
                    const [y, m, d] = prev.scheduleStartDate.split('-').map(Number)
                    const nextDay = new Date(y, m - 1, d + 1)
                    const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`
                    return {
                        ...prev,
                        [id]: value,
                        hour: h,
                        scheduleEndTime: overMidnight ? `00:${mins}` : `${String(h + 1).padStart(2, '0')}:${mins}`,
                        scheduleEndDate: overMidnight ? nextDayStr : prev.scheduleStartDate,
                    }
                })
                break
            }
            default:
                setTrailerForm((prev: TrailerForm) => ({ ...prev, [id]: value }))
        }
    }

    const handleSelectChange = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setTrailerForm((prev: TrailerForm) => ({ ...prev, [id]: e.target.value }))
    }

    const update = () => {
        setAllTrls((prev: TrailerRecord[]) =>
            prev.map((trk: TrailerRecord) =>
                trk.uuid === editedTrl.uuid ? { ...trk, ...trailerForm } : trk
            )
        )
        setEdit(!edit)
    }

    useEffect(() => {
        setTrailerForm({
            hour:              editedTrl.hour || 0,
            lmsAccent:         editedTrl.lmsAccent || '',
            dockCode:          editedTrl.dockCode || '',
            acaType:           editedTrl.acaType || '',
            status:            editedTrl.status || '',
            routeId:           editedTrl.routeId || '',
            scac:              editedTrl.scac || '',
            trailer1:          editedTrl.trailer1 || '',
            trailer2:          editedTrl.trailer2 || '',
            firstSupplier:     editedTrl.firstSupplier || '',
            dockStopSequence:  editedTrl.dockStopSequence || '',
            planStartDate:     editedTrl.planStartDate || '',
            planStartTime:     editedTrl.planStartTime || '',
            scheduleStartDate: editedTrl.scheduleStartDate || '',
            adjustedStartTime: editedTrl.adjustedStartTime || '',
            scheduleEndDate:   editedTrl.scheduleEndDate || '',
            scheduleEndTime:   editedTrl.scheduleEndTime || '',
            gateArrivalTime:   editedTrl.gateArrivalTime || '',
            doorArrivalTime:   editedTrl.doorArrivalTime || '',
            actualStartTime:   editedTrl.actualStartTime || '',
            actualEndTime:     editedTrl.actualEndTime || '',
            statusOX:          editedTrl.statusOX || '',
            ryderComments:     editedTrl.ryderComments || '',
            gmComments:        editedTrl.gmComments || '',
            dateShift:         editedTrl.dateShift || '',
            door:              editedTrl.door || '',
            lowestDoh:         editedTrl.lowestDoh || '',
            loadComments:      editedTrl.loadComments || '',
        })
    }, [])

    return (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: 'auto', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
                Edit Trailer
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" noValidate autoComplete="off">
                {/* ── Load & Route ── */}
                <SectionLabel>Load &amp; Route</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="lmsAccent" label="LMS Accent" value={trailerForm.lmsAccent ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="routeId" label="Route ID" value={trailerForm.routeId ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="scac" label="SCAC" value={trailerForm.scac ?? ''} onChange={handleChange} />
                    </Grid>
                </Grid>

                {/* ── Dock ── */}
                <SectionLabel>Dock</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="dockCode" label="Dock Code" value={trailerForm.dockCode ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="dockStopSequence" label="Dock Stop Sequence" value={trailerForm.dockStopSequence ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="acaType" label="ACA Type" value={trailerForm.acaType ?? ''} onChange={handleChange} />
                    </Grid>
                </Grid>

                {/* ── Trailers & Supplier ── */}
                <SectionLabel>Trailers &amp; Supplier</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="trailer1" label="Trailer 1" value={trailerForm.trailer1 ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="trailer2" label="Trailer 2" value={trailerForm.trailer2 ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="firstSupplier" label="First Supplier" value={trailerForm.firstSupplier ?? ''} onChange={handleChange} />
                    </Grid>
                </Grid>

                {/* ── Schedule ── */}
                <SectionLabel>Schedule</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="planStartDate" label="Plan Start Date" type="date" value={trailerForm.planStartDate ?? ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="planStartTime" label="Plan Start Time" type="time" value={trailerForm.planStartTime ?? ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="scheduleStartDate" label="Schedule Start Date" type="date" value={trailerForm.scheduleStartDate ?? ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="adjustedStartTime" label="Adjusted Start Time" type="time" value={trailerForm.adjustedStartTime ?? ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="scheduleEndDate" label="Schedule End Date" type="date" value={trailerForm.scheduleEndDate ?? ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="scheduleEndTime" label="Schedule End Time" type="time" value={trailerForm.scheduleEndTime ?? ''} onChange={handleChange} InputLabelProps={{ shrink: true }} />
                    </Grid>
                </Grid>

                {/* ── Status ── */}
                <SectionLabel>Status</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field id="status" label="Status" value={trailerForm.status ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Field
                            id="statusOX"
                            label="Status OX"
                            select
                            value={trailerForm.statusOX ?? ''}
                            onChange={handleSelectChange('statusOX')}
                        >
                            {STATUS_OX_OPTIONS.map(o => (
                                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                            ))}
                        </Field>
                    </Grid>
                </Grid>

                {/* ── Comments ── */}
                <SectionLabel>Comments</SectionLabel>
                <Grid container spacing={2} mb={4}>
                    <Grid size={{ xs: 12 }}>
                        <Field id="loadComments" label="Load Comments" multiline rows={2} value={trailerForm.loadComments ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Field id="ryderComments" label="Ryder Comments" multiline rows={2} value={trailerForm.ryderComments ?? ''} onChange={handleChange} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Field id="gmComments" label="GM Comments" multiline rows={2} value={trailerForm.gmComments ?? ''} onChange={handleChange} />
                    </Grid>
                </Grid>

                {/* ── Actions ── */}
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button variant="outlined" color="warning" onClick={() => setEdit(!edit)}>
                        Back
                    </Button>
                    <Button variant="contained" onClick={update}>
                        Save
                    </Button>
                </Box>
            </Box>
        </Paper>
    )
}

export default EditTrailer
