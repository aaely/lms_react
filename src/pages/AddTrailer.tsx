import { useAtom } from "jotai"
import { allTrls as a, trailerForm as tfrm, type TrailerForm, type TrailerRecord } from "../signals/signals"
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
import { v4 } from "uuid"

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

const localDateString = (): string => {
    const d = new Date(Date.now())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const currentShift = () => {
    const t = new Date()
    const h = t.getHours()
    if (h >= 23 && h < 7) {
        return '1st'
    }
    if (h >= 7 && h < 15) {
        return '2nd'
    } 
    return '3rd'
}

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />

const today = new Date().toLocaleDateString('en-CA')

const EMPTY_FORM: TrailerForm = {
    hour:              0,
    lmsAccent:         '',
    dockCode:          '',
    acaType:           '',
    status:            '',
    routeId:           '',
    scac:              '',
    trailer1:          '',
    trailer2:          '',
    firstSupplier:     '',
    dockStopSequence:  '',
    planStartDate:     today,
    planStartTime:     '',
    scheduleStartDate: today,
    adjustedStartTime: '',
    scheduleEndDate:   today,
    scheduleEndTime:   '',
    gateArrivalTime:   '',
    doorArrivalTime:   '',
    actualStartTime:   '',
    actualEndTime:     '',
    statusOX:          'A',
    ryderComments:     '',
    gmComments:        '',
    dateShift:         '',
    door:              '',
    lowestDoh:         '',
    loadComments:      '',
}

interface Props {
    onBack: () => void
}

const AddTrailer = ({ onBack }: Props) => {
    const [trailerForm, setTrailerForm] = useAtom<TrailerForm>(tfrm)
    const [, setAllTrls] = useAtom(a)

    const handleChange = ({ target: { id, value } }: any) => {
        switch (id) {
            case 'adjustedStartTime':
            case 'planStartTime': {
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
                        adjustedStartTime: value,
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

    const handleAdd = () => {
        const newRecord: TrailerRecord = {
            ...trailerForm,
            uuid:         v4(),
            dateShift:    `${localDateString()}-${currentShift()}`,
            origin:       'Manual',
            editRef:      '',
            dockComments: '',
            lateComments: '',
        }
        setAllTrls((prev: TrailerRecord[]) => [...prev, newRecord])
        setTrailerForm(EMPTY_FORM)
        onBack()
    }

    return (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: 'auto', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
                Add Trailer
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
                    <Button variant="outlined" color="warning" onClick={onBack}>
                        Back
                    </Button>
                    <Button variant="contained" onClick={handleAdd}>
                        Add Trailer
                    </Button>
                </Box>
            </Box>
        </Paper>
    )
}

export default AddTrailer
