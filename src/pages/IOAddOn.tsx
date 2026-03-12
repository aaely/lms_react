import { useAtom } from 'jotai'
import { useState } from 'react'
import { api } from '../utils/api'
import { ioScreen, editedIo, initialEditedIo, ioForm, user } from '../signals/signals'
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

const STATUS = ["Drop", "Pending", "Confirm"];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
);

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />;


const IOAddOn = () => {

    const [form, setForm] = useAtom(ioForm)
    const [partInput, setPartInput] = useState("");
    const [sidInput, setSidInput] = useState("");
    const [, setU] = useAtom(user)
    const [supplier, setSupplier] = useState('')
    const [, setScreen] = useAtom(ioScreen)
    const [, setE] = useAtom(editedIo)

    const handleSubmit = async () => {
        try {
            let lines = [];
            const max = form.sids.length > form.parts.length ? form.sids.length : form.parts.length
            for (let i = 0; i < max; i++) {
                const line = {
                    trailer: form.trailer,
                    sid: form.sids[0],
                    part: form.parts[i],
                    quantity: '0',
                    duns: '',
                    cisco: '18008',
                    destination: form.destination,
                    state: 'TX',
                    supplier
                }
                lines.push(line)
            }
            await api.post('/api/upload_in_transit', lines)
            setE(initialEditedIo)
            setScreen(0)
        } catch (error) {
            console.log(error)
        }
    }

    const handleChange = ({ target: { id, value } }: any) => {
        if (id === 'supplier') {
            setSupplier(value)
            return
        }
        setForm({
            ...form,
            [id]: value
        })
    }

    const handleLogout = () => {
        setU({
            email: '',
            id: 0,
            accessToken: '',
            refreshToken: '',
            role: ''
        })
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

    return (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: "auto", borderRadius: 2 }}>
            {/* ── Header ── */}
            <a style={{ marginLeft: 'auto', marginRight: 'auto' }} href="/" className="btn btn-secondary mt-3">
                Back to Landing
            </a>
            <Typography onClick={() => setScreen(prev => prev === 0 ? 1 : 0)} variant="h6" fontWeight={700} gutterBottom>
                Io Add On
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

                <SectionLabel>Comments</SectionLabel>
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field
                            id="destination"
                            label="Destination"
                            value={form?.destination ?? ""}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field
                            id="supplier"
                            label="Supplier"
                            value={supplier ?? ""}
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
                    <Button variant="contained" onClick={handleSubmit}>
                        Submit Exception
                    </Button>

                </Box>
            </Box>
        </Paper>
    )

}

export default IOAddOn