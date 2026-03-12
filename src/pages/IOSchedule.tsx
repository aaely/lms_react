import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { api, withTokenRefresh } from '../utils/api'
import { ioScreen, editedIo, initialEditedIo, ioForm, lowestDoh, user, exceptionLogForm, type ExceptionLogForm } from '../signals/signals'
import {
    Box,
    Button,
    Chip,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { trailerApi } from '../../netlify/functions/trailerApi';
import IOAddOn from './IOAddOn';

const STATUS = ["Drop", "Pending", "Confirm"];
const EXCEPTION_TYPES = ["IO Container", "IO Offload Drop", "IO Drop", "IO Direct", "Expedite", "Deviation"];
const STATUS_OPTIONS = ["Active", "Expedite"];

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
);

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />;


const IOSchedule = () => {

    const [io, setIo] = useState<any[]>([])
    const [ldoh] = useAtom(lowestDoh)
    const lowestDohAsMap = new Map(Object.entries(ldoh))
    const [screen, setScreen] = useAtom(ioScreen)
    const [e, setE] = useAtom(editedIo)
    const [form, setForm] = useAtom(ioForm)
    const [u, setU] = useAtom(user)
    const [partInput, setPartInput] = useState("");
    const [sidInput, setSidInput]   = useState("");
    const [el, setEl] = useAtom(exceptionLogForm)

    const getLDoh = (parts: string[]) => {
        if (parts.length < 1) return undefined;
        
        let lowest: number | undefined;
        
        for (let i = 0; i < parts.length; i++) {
            const currentValue = lowestDohAsMap.get(parts[i]);
            
            if (currentValue === undefined) continue;
            
            if (lowest === undefined || currentValue < lowest) {
                lowest = currentValue;
            }
        }
        
        return lowest;
    }

    useEffect(() => {
        const fetchIoData = async () => {
            try {
                const res = await api.get<Array<{ Parts: string[] }>>('/api/get_io')
                
                const enriched = res.data
                    .map(item => ({
                        ...item,
                        lDoh: getLDoh(item.Parts)
                    }))
                    .sort((a, b) => {
                        if (a.lDoh === undefined && b.lDoh === undefined) return 0
                        if (a.lDoh === undefined) return 1
                        if (b.lDoh === undefined) return -1
                        return a.lDoh - b.lDoh
                    })

                setIo(enriched)
            } catch (error) {
                console.error('Failed to fetch IO data:', error)
            }
        }

        fetchIoData()
    }, [e])

    const router = (screen: number) => {
        switch (screen) {
            case 0:
                return renderTable()
            case 1:
                return editEntry()
            case 2:
                return scheduleForm()
            case 3:
                return <IOAddOn />
            default: break;
        }
    }

    const handleEdit = (entry: any) => {
        setScreen(prev => prev === 0 ? 1 : 0)
        setE(entry)
    }

    const handleChange = ({target: {id, value}}: any) => {
        setForm({
            ...form,
            [id]: value
        })
    }

    const handleElChange = ({ target: { id, value } }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            switch (id) {
                case 'newDate': {
                    setEl((prev: ExceptionLogForm) => {
                        return {
                            ...prev,
                            [id]: value,
                            newEndDate: value
                        }
                    })
                    break;
                }
                case "newTime": {
                    const [hour, mins] = value.split(":");
                    const overMidnight = parseInt(hour) >= 23;
                    setEl((prev: ExceptionLogForm) => {
                        const [year, month, day] = prev.newEndDate.split("-").map(Number);
                        const prevDate = new Date(year, month - 1, day);
                        if (overMidnight) prevDate.setDate(prevDate.getDate() + 1);
                        const nextHour = String(parseInt(hour) + 1).padStart(2, '0');
                        return {
                            ...prev,
                            [id]: value,
                            newEndDate: overMidnight ? formatDate(prevDate) : prev.newEndDate,
                            newEndTime: overMidnight ? `00:${mins}` : `${nextHour}:${mins}`,
                            hour,
                        };
                    });
                    break;
                }
                default: {
                    setEl((prev: ExceptionLogForm) => ({ ...prev, [id]: value }));
                    break;
                }
            }
        }; 

    const handleElSelectChange =
        (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
            switch (id) {
                case 'type': {
                    if (e.target.value === 'Expedite') {
                        setEl((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: e.target.value,
                                status: 'Expedite'
                            }
                        })
                        break;
                    } else if (e.target.value.includes('IO')) {
                        setEl((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: e.target.value,
                                comment: `${e.target.value} One Way No Reload`
                            }
                        })
                        break;
                    } else {
                        setEl((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: e.target.value,
                                status: 'Active'
                            }
                        })
                        break;
                    }

                }
                default: {
                    handleElChange({ target: { id, value: e.target.value } } as any)
                    break;
                }
            }

        }
    
    const handleSubmitSchedule = async () => {
        try {
            const sched = {
                Comments: el.comment,
                Destination: e.Schedule.Destination,
                OriginalDate: el.originalDate,
                ScheduleDate: el.newDate,
                ScheduleTime: el.newTime,
                Status: 'Pending',
                TrailerID: el.trailer1,
                Supplier: el.supplier,
                Scac: el.scac
            }
            const updated = {
                Trailer: el.trailer1,
                Sids: e.Sids,
                Parts: e.Parts,
                Schedule: sched
            }
            const updt = {
                ...el,
                requestor: u.email
            }
            console.log(updated, updt)
            await api.post('/api/update_io', updated)
            await withTokenRefresh((token) => 
                trailerApi.pushException(token, [updt])
            )
            setE(initialEditedIo)
            setScreen(0)
        } catch (error) {
            console.log(error)
        }
    }

    const scheduleForm = () => {
        return(
            <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: "auto", borderRadius: 2 }}>
                {/* ── Header ── */}
                <a style={{ marginLeft: 'auto', marginRight: 'auto' }} href="/" className="btn btn-secondary mt-3">
                    Back to Landing
                </a>
                <Typography onClick={() => setScreen(0)} variant="h6" fontWeight={700} gutterBottom>
                    Schedule Trailer
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box component="form" noValidate autoComplete="off">
                    {/* ── Load & Route ── */}
                    <SectionLabel>Load &amp; Route</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="loadNum"
                                label="Load Number"
                                value={el?.loadNum ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="route"
                                label="Route"
                                value={el?.route ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="scac"
                                label="SCAC"
                                value={el?.scac ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Dock ── */}
                    <SectionLabel>Dock</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="dock"
                                label="Dock"
                                value={el?.dock ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="dockSequence"
                                label="Dock Sequence"
                                value={el?.dockSequence ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Trailers & Supplier ── */}
                    <SectionLabel>Trailers &amp; Supplier</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="trailer1"
                                label="Trailer 1"
                                value={el?.trailer1 ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="trailer2"
                                label="Trailer 2"
                                value={el?.trailer2 ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="supplier"
                                label="Supplier"
                                value={el?.supplier ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Exception Details ── */}
                    <SectionLabel>Exception Details</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="type"
                                label="Exception Type"
                                select
                                value={el?.type ?? ""}
                                onChange={handleElSelectChange("type")}
                            >
                                {EXCEPTION_TYPES.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                            </Field>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="status"
                                label="Status"
                                select
                                value={el?.status ?? ""}
                                onChange={handleElSelectChange("status")}
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </Field>
                        </Grid>
                    </Grid>

                    {/* ── Original Schedule ── */}
                    <SectionLabel>Original Schedule</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="originalDate"
                                label="Original Date"
                                type="date"
                                value={el?.originalDate ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="originalTime"
                                label="Original Time"
                                type="time"
                                value={el?.originalTime ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    {/* ── New Schedule ── */}
                    <SectionLabel>New Schedule</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newDate"
                                label="New Date"
                                type="date"
                                value={el?.newDate ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newTime"
                                label="New Time"
                                type="time"
                                value={el?.newTime ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newEndDate"
                                label="New End Date"
                                type="date"
                                value={el?.newEndDate ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newEndTime"
                                label="New End Time"
                                type="time"
                                value={el?.newEndTime ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Comment ── */}
                    <SectionLabel>Comment</SectionLabel>
                    <Grid container spacing={2} mb={4}>
                        <Grid size={{ xs: 12 }}>
                            <Field
                                id="comment"
                                label="Comment"
                                multiline
                                rows={4}
                                value={el?.comment ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Actions ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                        <a href="/" className="btn btn-info mb-3">Home</a>
                        <Button variant="outlined" color="error" onClick={handleLogout}>
                            Logout
                        </Button>
                        <Button variant="outlined" color="inherit" onClick={handleReset}>
                            Reset
                        </Button>
                        <Button variant="contained" onClick={handleSubmitSchedule}>
                            Submit Exception
                        </Button>

                    </Box>
                </Box>
            </Paper>
        )
    }

    const schedule = (trl: any) => {
        setE(trl)
        setScreen(2)
    }

    const handleConfirm = async (trl: any) => {
        try {
            const sched = {
                Comments: trl.Schedule.Comments,
                Destination: trl.Schedule.Destination,
                OriginalDate: trl.Schedule.OriginalDate,
                ScheduleDate: trl.Schedule.ScheduleDate,
                ScheduleTime: trl.Schedule.ScheduleTime,
                Status: 'Confirmed',
                TrailerID: trl.Trailer,
                Supplier: trl.Schedule.Supplier,
                Scac: trl.Schedule.Scac
            }
            const updated = {
                Trailer: trl.Trailer,
                Sids: trl.Sids,
                Parts: trl.Parts,
                Schedule: sched
            }
            const u = { ...updated, lDoh: trl.lDoh}
            await api.post('/api/update_io', updated)
            setIo((prev: any[]) => 
                prev.map(item => item.Trailer === trl.Trailer ? u : item)
            )
        } catch (error) {
            console.log(error)
        }
    }

    const renderTable = () => {
        return (
            <>
                <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100vh',
                        width: '100%',
                        overflow: 'auto'
                    }}>
                    <div style={{ padding: '20px', flex: 1, overflow: 'hidden' }}>
                            <div style={{ overflow: 'auto', height: '100%', position: 'relative' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                                    <thead>
                                        <tr style={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 20,
                                        background: 'white',
                                        width: '100%'
                                        }}>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>#</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Trailer</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Destination</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Original Schedule Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Sids</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Schedule Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Schedule Time</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Carrier</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Parts</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Lowest DoH</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            io?.map((trl: any, index: number) => {
                                                if (trl.Trailer === 'ECMU5841039') {console.log(trl)}
                                                return (
                                                    <tr key={index} style={{backgroundColor: index % 2 !== 0 ? '#dddada' : '#fff'}}>
                                                        <td>{index + 1}</td>
                                                        <td>{trl.Trailer}</td>
                                                        <td>{trl.Schedule.Destination}</td>
                                                        <td>{trl.Schedule.OriginalDate}</td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>
                                                            {trl.Sids.map((s: any, index: number) => {
                                                                return(
                                                                    <p key={`${index}-${s}-${trl.Trailer}`}>
                                                                        {s}
                                                                    </p>
                                                                )
                                                            })}
                                                        </td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>{trl.Schedule.ScheduleDate}</td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>{trl.Schedule.ScheduleTime}</td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>{trl.Schedule.Scac}</td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>
                                                            {trl.Parts.map((p: any, index: number) => {
                                                                return(
                                                                    <p key={`${index}-${p}-${trl.Trailer}`}>
                                                                        {p} | {lowestDohAsMap.get(p)}
                                                                    </p>
                                                                )
                                                            })}
                                                        </td>
                                                        <td>
                                                            {trl.lDoh}
                                                        </td>
                                                        <td>
                                                            {trl.Schedule.Comments}
                                                        </td>
                                                        <td>
                                                            <a onClick={() => schedule(trl)} className="btn btn-warning mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Schedule
                                                            </a>
                                                        </td>
                                                        <td>
                                                            <a onClick={() => handleEdit(trl)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                Edit
                                                            </a>
                                                        </td>
                                                        <td>
                                                            {trl.Schedule.Status === 'Pending' &&
                                                                <a onClick={() => handleConfirm(trl)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    Confirm
                                                                </a>
                                                            }
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        }                                    
                                    </tbody> 
                                </table>
                            </div>
                        </div>
                </div>
                <div className='float-button' onClick={() => setScreen(3)}>
                    +
                </div>
            </>
        )
    }

    const handleSelectChange =
        (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
            switch (id) {
                default: {
                    handleChange({ target: { id, value: e.target.value } } as any)
                    break;
                }
            }

    }

    const handleReset = () => {
        // TODO: reset atom to initial state
    };

    const handleLogout = () => {
        setU({
            email: '',
            id: 0,
            accessToken: '',
            refreshToken: '',
            role: ''
        })
    }

    useEffect(() => {
        if (screen === 1) {
            setForm({
                ...form,
                trailer: e.Trailer || '',
                status: e.Schedule.Status || '',
                comments: e.Schedule.Comments || '',
                destination: e.Schedule.Destination || '',
                sids: e.Sids || [],
                parts: e.Parts || [],
                originalDate: new Date(e.Schedule.OriginalDate).toDateString() || '',
                scheduleDate: new Date(e.Schedule.ScheduleDate).toDateString() || '',
                scheduleTime: new Date(e.Schedule.ScheduleTime).toLocaleTimeString() || '',
            })
        } 
        if (screen === 2) {
            setEl({
                loadNum: 'IO',
                dock: e.Schedule.Destination === 'Arlington, TX' ? 'V' : 'U',
                dockSequence: e.Schedule.Destination === 'Arlington, TX' ? 'V' : 'U',
                type: 'IO Container',
                status: 'Active',
                route: 'IO',
                scac: e.Schedule.Scac || '',
                trailer1: e.Schedule.TrailerID || '',
                trailer2: '',
                supplier: e.Schedule.Supplier,
                originalDate: e.Schedule.OriginalDate.length < 1 ? new Date().toLocaleDateString('en-CA') : e.Schedule.OriginalDate,
                originalTime: '00:00',
                newDate: e.Schedule.ScheduleDate || '',
                newTime: e.Schedule.ScheduleTime || '',
                newEndDate: '',
                newEndTime: '',
                comment: e.Schedule.Comments || `IO Container One Way No Reload`
            })
        }
    }, [e])

    const getBg = (status: string) => {
        switch (status) {
            case 'Pending':
                return 'yellow'
            case 'Drop':
                return '#FF1493'
            case 'Confirmed':
                return 'green'
            default: return 'inherit'
        }
    }

    const handleSubmit = async () => {
        try {
            const sched = {
                Comments: form.comments,
                Destination: form.destination,
                OriginalDate: form.originalDate,
                ScheduleDate: form.scheduleDate,
                ScheduleTime: form.scheduleTime,
                Status: form.status,
                TrailerID: form.trailer,
                Supplier: e.Schedule.Supplier
            }
            const updated = {
                Trailer: e.Trailer,
                Sids: form.sids,
                Parts: form.parts,
                Schedule: sched
            }
            await api.post('/api/update_io', updated)
            setE(initialEditedIo)
            setScreen(prev => prev === 0 ? 1 : 0)
        } catch (error) {
            console.log(error)
        }
    }

    const editEntry = () => {

        return(
            <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: "auto", borderRadius: 2 }}>
                {/* ── Header ── */}
                <a style={{ marginLeft: 'auto', marginRight: 'auto' }} href="/" className="btn btn-secondary mt-3">
                    Back to Landing
                </a>
                <Typography onClick={() => setScreen(prev => prev === 0 ? 1 : 0)} variant="h6" fontWeight={700} gutterBottom>
                    Io Edit
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box component="form" noValidate autoComplete="off">
                    {/* ── Load & Route ── */}
                    <SectionLabel>Trailer</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="trailer"
                                label="Trailer"
                                value={form?.trailer ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Trailers & Supplier ── */}
                    <SectionLabel>Comments</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="comments"
                                label="Comments"
                                value={form?.comments ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="destination"
                                label="Destination"
                                value={form?.destination ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>

                    <SectionLabel>Parts & Sids</SectionLabel>

                        {/* Parts */}
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Field
                                        id="partInput"
                                        label="Add Part"
                                        value={partInput}
                                        onChange={(e: any) => setPartInput(e.target.value)}
                                        onKeyDown={(e: any) => {
                                            if (e.key === "Enter" && partInput.trim()) {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    parts: [...(prev?.parts ?? []), partInput.trim()],
                                                }));
                                                setPartInput("");
                                            }
                                        }}
                                    />
                                    <IconButton
                                        onClick={() => {
                                            if (partInput.trim()) {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    parts: [...(prev?.parts ?? []), partInput.trim()],
                                                }));
                                                setPartInput("");
                                            }
                                        }}
                                    >
                                        Add
                                    </IconButton>
                                </Box>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                    {form?.parts?.map((part: any, i: number) => (
                                        <Chip
                                            key={i}
                                            label={part}
                                            onDelete={() =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    parts: prev?.parts?.filter((_, idx) => idx !== i) ?? [],
                                                }))
                                            }
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Grid>

                        {/* Sids */}
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                    <Field
                                        id="sidInput"
                                        label="Add SID"
                                        value={sidInput}
                                        onChange={(e: any) => setSidInput(e.target.value)}
                                        onKeyDown={(e: any) => {
                                            if (e.key === "Enter" && sidInput.trim()) {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    sids: [...(prev?.sids ?? []), sidInput.trim()],
                                                }));
                                                setSidInput("");
                                            }
                                        }}
                                    />
                                    <IconButton
                                        onClick={() => {
                                            if (sidInput.trim()) {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    sids: [...(prev?.sids ?? []), sidInput.trim()],
                                                }));
                                                setSidInput("");
                                            }
                                        }}
                                    >
                                        Add
                                    </IconButton>
                                </Box>
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                    {form?.sids?.map((sid, i) => (
                                        <Chip
                                            key={i}
                                            label={sid}
                                            onDelete={() =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    sids: prev?.sids?.filter((_, idx) => idx !== i) ?? [],
                                                }))
                                            }
                                        />
                                    ))}
                                </Box>
                            </Box>
                        </Grid>

                    {/* ── Exception Details ── */}
                    <SectionLabel>Status</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="status"
                                label="Status"
                                select
                                value={form?.status ?? ""}
                                onChange={handleSelectChange('status')}
                            >
                                {STATUS.map((t) => (
                                    <MenuItem key={t} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                            </Field>
                        </Grid>
                    </Grid>

                    {/* ── Original Schedule ── */}
                    <SectionLabel>Original Schedule</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="originalDate"
                                label="Original Date"
                                type="date"
                                value={form?.originalDate ?? ""}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    {/* ── New Schedule ── */}
                    <SectionLabel>Schedule</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newDate"
                                label="New Date"
                                type="date"
                                value={form?.scheduleDate ?? ""}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newTime"
                                label="New Time"
                                type="time"
                                value={form?.scheduleTime ?? ""}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    {/* ── Actions ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                        <a href="/" className="btn btn-info mb-3">Home</a>
                        <Button variant="outlined" color="error" onClick={handleLogout}>
                            Logout
                        </Button>
                        <Button variant="outlined" color="inherit" onClick={handleReset}>
                            Reset
                        </Button>
                        <Button variant="contained" onClick={handleSubmit}>
                            Submit Exception
                        </Button>

                    </Box>
                </Box>
            </Paper>
        )
    }

    return (
        <div style={{width: '95vw'}}>
            {router(screen)}
        </div>
    )
}

export default IOSchedule