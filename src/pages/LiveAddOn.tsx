import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { trailerForm as tfrm, liveScreen, liveTrailers, type TrailerForm, type LMSRecord } from "../signals/signals"
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
import { api } from "../utils/api"
import useLmsSuggestions from "../utils/useLmsSuggestions"
import LmsSuggestionList from "../components/LmsSuggestionList"
import useFirstSupplier from "../utils/useFirstSupplier"
import { v4 } from 'uuid'
import { boardDateShift, clockDateShift, outsideShiftWindow, shiftOf } from '../utils/dateShift'
import ShiftWindowWarning from '../components/ShiftWindowWarning'

const STATUS_OX_OPTIONS = [
    { value: 'O', label: 'O - On Time' },
    { value: 'X', label: 'X - Exception' },
    { value: 'L', label: 'L - Late' },
    { value: 'N', label: 'N - No Show' },
    { value: 'C', label: 'C - Carry Over' },
    { value: 'R', label: 'R - Reschedule' },
    { value: 'Y', label: 'Y - Yellow Card' },
    { value: 'D', label: 'D - Already Delivered' },
]

const SHIFTS = ['1st', '2nd', '3rd']

const docks = ['A', 'BE', 'BN', 'BW', 'F', 'E', 'F1', 'P', 'D', 'U', 'V']

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
)

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />

interface AddOnProps {
    /** Heading, so the next-shift board can say which board it is adding to. */
    title?:    string
    /** Where the row lands: the live sheet by default, or the staged board. */
    endpoint?: string
    /** ACA type stamped on the new row. */
    acaType?:  string
    /** Defaults to returning to the live sheet's own screen atom. */
    onBack?:   () => void
    /**
     * The dateShift to file the row under. Next Shift passes the shift being staged,
     * or null when it can't tell. Omitted, it's read from the board's own rows.
     */
    dateShift?: string | null
    /** Starting value for the Date/Shift fields the user confirms when it can't be told. */
    dateShiftGuess?: string
}

const LiveAddOn = ({
    title    = 'Live Add On',
    endpoint = '/api/push_add_on',
    acaType  = 'AddOn In-Shift',
    onBack,
    dateShift: givenStamp,
    dateShiftGuess,
}: AddOnProps) => {
    const [trailerForm, setTrailerForm] = useAtom<TrailerForm>(tfrm)
    const [, setScreen] = useAtom(liveScreen)
    // Rows of the board being added to — the live sheet, or the staged board on Next Shift
    const [board] = useAtom(liveTrailers)
    const lms = useLmsSuggestions(trailerForm.lmsAccent ?? '', trailerForm.routeId ?? '')

    const back = onBack ?? (() => setScreen(0))

    const firstSupplier = useFirstSupplier(supplier =>
        setTrailerForm((prev: TrailerForm) => ({ ...prev, firstSupplier: supplier })))


    const handleSelectLms = (record: LMSRecord) => {
        const arrivalTime = record.schedule_arrival_time
        const date = arrivalTime ? arrivalTime.slice(0, 10) : ''
        const time = arrivalTime ? arrivalTime.slice(11, 16) : ''
        const hour = arrivalTime ? parseInt(arrivalTime.slice(11, 13)) : 0
        const mins = arrivalTime ? arrivalTime.slice(14, 16) : '00'
        const endHour = hour >= 23 ? 0 : hour + 1
        const endDate = hour >= 23 ? (() => {
            const [y, m, d] = date.split('-').map(Number)
            const next = new Date(y, m - 1, d)
            next.setDate(next.getDate() + 1)
            return next.toLocaleDateString('en-CA')
        })() : date

        setTrailerForm((prev: TrailerForm) => ({
            ...prev,
            firstSupplier:    '',
            lmsAccent:        record.load_no,
            routeId:          record.route_id,
            scac:             record.scac,
            trailer1:         record.trailer,
            trailer2:         record.trailer2,
            dockCode:         record.dock,
            dockStopSequence: record.dock_sequence,
            planStartDate:    date,
            planStartTime:    time,
            scheduleStartDate: date,
            adjustedStartTime: time,
            scheduleEndDate:  endDate,
            scheduleEndTime:  `${String(endHour).padStart(2, '0')}:${mins}`,
            hour:             hour,
            // As the Exception Log does: a Y route is one way. Picking a non-Y load
            // takes the note back out, so it can't carry over from an earlier pick.
            loadComments:     record.route_id.toLowerCase().includes('y')
                ? 'One Way No Reload'
                : (prev.loadComments ?? '').replace('One Way No Reload', '').trim(),
        }))
        lms.picked(record)
        firstSupplier.lookup(record.route_id)
    }

    const handleChange = ({ target: { id, value } }: any) => {
        switch (id) {
            case 'planStartTime': {
                const [hour, mins] = value.split(':')
                setTrailerForm((prev: TrailerForm) => ({
                    ...prev,
                    [id]: value,
                    adjustedStartTime: value,
                    scheduleEndTime: parseInt(hour) >= 23 ? '00:' + mins : `${String(parseInt(hour) + 1).padStart(2, '0')}:${mins}`,
                    hour: parseInt(hour),
                }))
                break
            }
            case 'adjustedStartTime': {
                const [hour, mins] = value.split(':')
                setTrailerForm((prev: TrailerForm) => ({
                    ...prev,
                    [id]: value,
                    planStartTime: value,
                    scheduleEndTime: parseInt(hour) >= 23 ? '00:' + mins : `${String(parseInt(hour) + 1).padStart(2, '0')}:${mins}`,
                    hour: parseInt(hour),
                }))
                break
            }
            default:
                setTrailerForm((prev: TrailerForm) => ({ ...prev, [id]: value }))
        }
    }

    const handleSelectChange = (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setTrailerForm((prev: TrailerForm) => ({ ...prev, [id]: e.target.value }))
    }

    // Next Shift says which shift it is staging. On the live sheet, file the add-on
    // with the rows already on the board, so a special shift (say 12:00–21:00) isn't
    // split by the clock; carry-overs are re-stamped at the roll, so every live row
    // agrees.
    const inferredStamp = givenStamp !== undefined ? givenStamp : boardDateShift(board)

    // With nothing to read it from (an empty board), the user confirms the date and
    // shift, as on a shift roll. The fields start on a guess — the clock's, unless
    // the caller has a better one — which can't see a special shift or a late roll.
    const [guess] = useState(() => dateShiftGuess ?? clockDateShift())
    const [manualDate, setManualDate]   = useState(guess.slice(0, 10))
    const [manualShift, setManualShift] = useState(shiftOf(guess))
    const needsStamp = !inferredStamp
    const dateShift  = inferredStamp ?? (manualDate ? `${manualDate}-${manualShift}` : '')

    // Not a block, like the route spacing warning: a start time outside the shift
    // the row is being filed under is usually a wrong date or the wrong board.
    const offShift = outsideShiftWindow(
        dateShift, trailerForm.scheduleStartDate ?? '', trailerForm.adjustedStartTime ?? '', board)

    const pushAddOn = async () => {
        if (!dateShift) return
        try {
            const trl: any = {
                ...trailerForm,
                uuid: v4(),
                dateShift,
                origin: '',
                dockComments: '',
                gateArrivalDate: '',
                doorArrivalDate: '',
                actualStartDate: '',
                actualEndDate: '',
                stat: '',

                lowestDoh: '',
                hour: `${trailerForm.hour}`,
            }
            await api.post(endpoint, trl)
            back()
            window.location.reload()
        } catch (error) {
            console.log(error)
        }
    }

    const today = new Date(Date.now()).toLocaleDateString('en-CA')

    useEffect(() => {
        setTrailerForm({
            hour: 0,
            lmsAccent: '',
            dockCode: '',
            acaType: acaType,
            status: '',
            routeId: '',
            scac: '',
            trailer1: '',
            trailer2: '',
            firstSupplier: '',
            dockStopSequence: '',
            planStartDate: today,
            planStartTime: '',
            scheduleStartDate: today,
            adjustedStartTime: '',
            scheduleEndDate: today,
            scheduleEndTime: '',
            gateArrivalTime: '',
            doorArrivalTime: '',
            actualStartTime: '',
            actualEndTime: '',
            statusOX: '',
            ryderComments: '',
            gmComments: '',
            dateShift: '',
            door: '',
            lowestDoh: '',
            loadComments: '',
        })
    }, [])

    return (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: 'auto', borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
                {title}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box component="form" noValidate autoComplete="off">
                {/* ── Load & Route ── */}
                <SectionLabel>Load &amp; Route</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Field id="lmsAccent" label="LMS Accent" value={trailerForm.lmsAccent ?? ''} onChange={handleChange} />
                            <LmsSuggestionList suggestions={lms.byLoad} onSelect={handleSelectLms} />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ position: 'relative' }}>
                            <Field id="routeId" label="Route ID" value={trailerForm.routeId ?? ''} onChange={handleChange} />
                            <LmsSuggestionList suggestions={lms.byRoute} onSelect={handleSelectLms} showRoute />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field id="scac" label="SCAC" value={trailerForm.scac ?? ''} onChange={handleChange} />
                    </Grid>
                </Grid>

                {/* ── Dock ── */}
                <SectionLabel>Dock</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field
                            id="dock"
                            label="Dock"
                            select
                            value={trailerForm?.dockCode ?? ""}
                            onChange={handleSelectChange('dockCode')}
                            >
                            <MenuItem value="">
                                <em>Select Dock</em>
                            </MenuItem>

                            {docks.map((dock) => (
                                <MenuItem key={dock} value={dock}>
                                {dock}
                                </MenuItem>
                            ))}
                        </Field>
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
                        <Field id="firstSupplier" label="First Supplier" value={trailerForm.firstSupplier ?? ''} onChange={handleChange} helperText={firstSupplier.note(trailerForm.firstSupplier)} />
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

                <Box mb={offShift ? 3 : 0}>
                    <ShiftWindowWarning
                        dateShift={dateShift}
                        date={trailerForm.scheduleStartDate ?? ''}
                        time={trailerForm.adjustedStartTime ?? ''}
                        window={offShift}
                    />
                </Box>

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

                {/* ── Date/Shift, only when the board can't say ── */}
                {needsStamp && (
                    <>
                        <SectionLabel>Confirm Date / Shift</SectionLabel>
                        <Typography variant="body2" color="warning.main" sx={{ mb: 1.5 }}>
                            The board has no trailers to read the shift from. Check the date and
                            shift this add-on belongs to — 3rd shift is filed under the day it starts.
                        </Typography>
                        <Grid container spacing={2} mb={4}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Field
                                    label="Operational Date"
                                    type="date"
                                    value={manualDate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualDate(e.target.value)}
                                    error={!manualDate}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Field
                                    label="Shift"
                                    select
                                    value={manualShift}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualShift(e.target.value)}
                                >
                                    {SHIFTS.map(sh => <MenuItem key={sh} value={sh}>{sh}</MenuItem>)}
                                </Field>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">
                                    Filed under: <strong>{dateShift || '—'}</strong>
                                </Typography>
                            </Grid>
                        </Grid>
                    </>
                )}

                {/* ── Actions ── */}
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" justifyContent="flex-end" gap={2}>
                    <Button variant="outlined" color="warning" onClick={back}>
                        Back
                    </Button>
                    <Button variant="contained" onClick={pushAddOn} disabled={!dateShift}>
                        Save
                    </Button>
                </Box>
            </Box>
        </Paper>
    )
}

export default LiveAddOn
