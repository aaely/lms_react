import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { exceptionLogForm, user, type ExceptionLogForm, type ExceptionLog, editedExceptionEntry } from "../signals/signals"
//import { parse } from 'date-fns'
import {
    Box,
    Button,
    Divider,
    Grid,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { trailerApi } from "../../netlify/functions/trailerApi";

const EXCEPTION_TYPES = ["IO Container", "IO Offload Drop", "IO Drop", "IO Direct", "Expedite", "Deviation"];
const STATUS_OPTIONS = ["Active", "Expedite"];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
);

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />;

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const ExLog = () => {
    const [u, setU] = useAtom(user)
    const [form, setForm] = useAtom(exceptionLogForm)
    const [edited, setEdited] = useAtom(editedExceptionEntry)
    const [entries, setEntries] = useState<ExceptionLog[]>([])
    const [view, setView] = useState(0)

    const handleChange = ({ target: { id, value } }: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        switch (id) {
            case 'newDate': {
                setForm((prev: ExceptionLogForm) => {
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
                setForm((prev: ExceptionLogForm) => {
                    const [year, month, day] = prev.newEndDate.split("-").map(Number);
                    const prevDate = new Date(year, month - 1, day);
                    if (overMidnight) prevDate.setDate(prevDate.getDate() + 1);
                    return {
                        ...prev,
                        [id]: value,
                        newEndDate: overMidnight ? formatDate(prevDate) : prev.newEndDate,
                        newEndTime: overMidnight ? `00:${mins}` : `${parseInt(hour) + 1}:${mins}`,
                        hour,
                    };
                });
                break;
            }
            default: {
                setForm((prev: ExceptionLogForm) => ({ ...prev, [id]: value }));
                break;
            }
        }
    };

    useEffect(() => {
        (async () => {
            try {
                const res = await trailerApi.getExceptionEntries(u.accessToken)
                setEntries(res.exceptions)
            } catch (error) {
                console.log(error)
            }
        })()
    }, [view])

    useEffect(() => {
        setForm({ 
            ...edited,
            originalDate: formatDate(new Date(edited.originalDate)),
            newDate: formatDate(new Date(edited.newDate)),
            newEndDate: formatDate(new Date(edited.newEndDate))
        })
    }, [edited])

    const handleSelectChange =
        (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
            switch (id) {
                case 'type': {
                    if (e.target.value === 'Expedite') {
                        setForm((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: e.target.value,
                                status: 'Expedite'
                            }
                        })
                        break;
                    } else {
                        setForm((prev: ExceptionLogForm) => {
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
                    handleChange({ target: { id, value: e.target.value } } as any)
                    break;
                }
            }

        }
    const handleSubmit = async () => {
        try {
            await trailerApi.pushException(u.accessToken, [form])
            setView(prev => prev === 0 ? 1 : 0)
        } catch (error) {
            console.log(error)
        }
    };

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

    const handleEdit = (entry: ExceptionLog) => {
        setEdited({ ...entry })
        setView(prev => prev === 0 ? 1 : 0)
    }

    const renderEntries = () => {
        return (
            <div style={{
                display: 'flex',
                width: '90vw',
                height: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column'
            }}>
                <h1 onClick={() => setView(prev => prev === 0 ? 1 : 0)}>
                    Exception Log Entries
                </h1>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {[
                                '#', 'Load #', 'Route', 'Scac', 'Trailer', 'Dock',
                                'Dock Sequence', 'Supplier', 'Type', 'Status', 'Schedule Date',
                                'Schedule Time', 'End Date', 'End Time', 'Comment'
                            ].map((header, i) => (
                                <th key={i} style={{
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: '#f5f5f5',
                                    color: '#333',
                                    padding: '12px',
                                    borderBottom: '2px solid #333',
                                    borderTop: '1px solid #ddd',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                    boxShadow: 'inset 0 -1px 0 #ddd',
                                    textAlign: 'center',
                                    fontWeight: '600'
                                }}>
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry: ExceptionLog, index: number) => {
                            return (
                                <tr style={{
                                    backgroundColor: index % 2 !== 0 ? '#cdd0d3' : 'white',
                                    textAlign: 'center'
                                }}>
                                    <td>
                                        {index + 1}
                                    </td>
                                    <td>
                                        {entry.loadNum}
                                    </td>
                                    <td>
                                        {entry.route}
                                    </td>
                                    <td>
                                        {entry.scac}
                                    </td>
                                    <td>
                                        {entry.trailer1}
                                    </td>
                                    <td>
                                        {entry.dock}
                                    </td>
                                    <td>
                                        {entry.dockSequence}
                                    </td>
                                    <td>
                                        {entry.supplier}
                                    </td>
                                    <td>
                                        {entry.type}
                                    </td>
                                    <td>
                                        {entry.status}
                                    </td>
                                    <td>
                                        {new Date(entry.newDate).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {entry.newTime}
                                    </td>
                                    <td>
                                        {new Date(entry.newEndDate).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {entry.newEndTime}
                                    </td>
                                    <td>
                                        {entry.comment}
                                    </td>
                                    <td>
                                        <a onClick={() => handleEdit(entry)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                            Edit
                                        </a>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    const renderForm = () => {
        return (
            <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: "auto", borderRadius: 2 }}>
                {/* ── Header ── */}
                <Typography onClick={() => setView(prev => prev === 0 ? 1 : 0)} variant="h6" fontWeight={700} gutterBottom>
                    Exception Log
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
                                value={form?.loadNum ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="route"
                                label="Route"
                                value={form?.route ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="scac"
                                label="SCAC"
                                value={form?.scac ?? ""}
                                onChange={handleChange}
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
                                value={form?.dock ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="dockSequence"
                                label="Dock Sequence"
                                value={form?.dockSequence ?? ""}
                                onChange={handleChange}
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
                                value={form?.trailer1 ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="trailer2"
                                label="Trailer 2"
                                value={form?.trailer2 ?? ""}
                                onChange={handleChange}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="supplier"
                                label="Supplier"
                                value={form?.supplier ?? ""}
                                onChange={handleChange}
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
                                value={form?.type ?? ""}
                                onChange={handleSelectChange("type")}
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
                                value={form?.status ?? ""}
                                onChange={handleSelectChange("status")}
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
                                value={form?.originalDate ?? ""}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="originalTime"
                                label="Original Time"
                                type="time"
                                value={form?.originalTime ?? ""}
                                onChange={handleChange}
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
                                value={form?.newDate ?? ""}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newTime"
                                label="New Time"
                                type="time"
                                value={form?.newTime ?? ""}
                                onChange={handleChange}
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
                                value={form?.newEndDate ?? ""}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newEndTime"
                                label="New End Time"
                                type="time"
                                value={form?.newEndTime ?? ""}
                                onChange={handleChange}
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
                                value={form?.comment ?? ""}
                                onChange={handleChange}
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
        <>
            {view > 0 ? renderEntries() : renderForm()}
        </>
    );
}

export default ExLog