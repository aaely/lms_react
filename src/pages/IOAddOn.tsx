import { useAtom } from 'jotai'
import { useState } from 'react'
import { api } from '../utils/api'
import { ioScreen, editedIo, initialEditedIo, ioForm } from '../signals/signals'
import {
    Box,
    Button,
    Divider,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    TextField,
    Typography,
} from "@mui/material";

const STATUS = ["Drop", "Pending", "Tentative", "Confirm"];

// Parts belong to a specific SID and carry their own quantity, so this is held
// locally rather than on the shared ioForm atom — IOSchedule's Io Edit screen
// still uses form.sids / form.parts as flat arrays.
interface SidPart {
    part: string;
    quantity: string;
}

interface SidGroup {
    sid: string;
    parts: SidPart[];
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
);

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />;


const IOAddOn = () => {

    const [form, setForm] = useAtom(ioForm)
    const [sidInput, setSidInput] = useState("");
    const [supplier, setSupplier] = useState('')
    const [shipDate, setShipDate] = useState('')
    const [sidGroups, setSidGroups] = useState<SidGroup[]>([])
    const [, setScreen] = useAtom(ioScreen)
    const [, setE] = useAtom(editedIo)

    const addSid = () => {
        const sid = sidInput.trim()
        if (!sid) return
        if (sidGroups.some(g => g.sid === sid)) return
        setSidGroups(prev => [...prev, { sid, parts: [{ part: '', quantity: '' }] }])
        setSidInput("")
    }

    const removeSid = (sidIdx: number) =>
        setSidGroups(prev => prev.filter((_, i) => i !== sidIdx))

    const addPartRow = (sidIdx: number) =>
        setSidGroups(prev => prev.map((g, i) =>
            i === sidIdx ? { ...g, parts: [...g.parts, { part: '', quantity: '' }] } : g
        ))

    const removePartRow = (sidIdx: number, partIdx: number) =>
        setSidGroups(prev => prev.map((g, i) =>
            i === sidIdx ? { ...g, parts: g.parts.filter((_, p) => p !== partIdx) } : g
        ))

    const updatePart = (sidIdx: number, partIdx: number, field: keyof SidPart, value: string) =>
        setSidGroups(prev => prev.map((g, i) =>
            i === sidIdx
                ? { ...g, parts: g.parts.map((p, pi) => pi === partIdx ? { ...p, [field]: value } : p) }
                : g
        ))

    const handleSubmit = async () => {
        try {
            // One line per (sid, part) — previously every part was sent against
            // sids[0] with a hardcoded quantity of '0'
            const lines = sidGroups.flatMap(group =>
                group.parts
                    .filter(p => p.part.trim() !== '')
                    .map(p => ({
                        trailer: form.trailer,
                        sid: group.sid,
                        part: p.part.trim(),
                        quantity: p.quantity.trim() === '' ? '0' : p.quantity.trim(),
                        duns: '',
                        cisco: '18008',
                        destination: form.destination,
                        state: 'TX',
                        location: '',
                        supplier,
                        shipDate,
                    }))
            )

            if (lines.length === 0) return

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
        if (id === 'shipDate') {
            setShipDate(value)
            return
        }
        setForm({
            ...form,
            [id]: value
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

    const lineCount = sidGroups.reduce(
        (n, g) => n + g.parts.filter(p => p.part.trim() !== '').length, 0
    )

    return (
        <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: "auto", borderRadius: 2 }}>
            {/* ── Header ── */}
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
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Field
                            id="shipDate"
                            label="Ship Date"
                            type="date"
                            value={shipDate}
                            onChange={handleChange}
                            InputLabelProps={{ shrink: true }}
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

                {/* ── SIDs, each with its own parts and quantities ── */}
                <SectionLabel>SIDs &amp; Parts</SectionLabel>
                <Box sx={{ display: 'flex', gap: 1, mb: 2, maxWidth: 420 }}>
                    <Field
                        id="sidInput"
                        label="Add SID"
                        value={sidInput}
                        onChange={(e: any) => setSidInput(e.target.value)}
                        onKeyDown={(e: any) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                addSid()
                            }
                        }}
                    />
                    <IconButton onClick={addSid}>Add</IconButton>
                </Box>

                {sidGroups.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Add a SID to start attaching parts.
                    </Typography>
                )}

                {sidGroups.map((group, sidIdx) => (
                    <Box
                        key={group.sid}
                        sx={{ border: '1px solid #ddd', borderRadius: 1, p: 2, mb: 2 }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                SID {group.sid}
                            </Typography>
                            <Button size="small" color="error" onClick={() => removeSid(sidIdx)}>
                                Remove SID
                            </Button>
                        </Box>

                        {group.parts.map((p, partIdx) => (
                            <Grid container spacing={2} key={partIdx} sx={{ mb: 1 }} alignItems="center">
                                <Grid size={{ xs: 12, sm: 5 }}>
                                    <Field
                                        label="Part"
                                        size="small"
                                        value={p.part}
                                        onChange={(e: any) => updatePart(sidIdx, partIdx, 'part', e.target.value)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 8, sm: 4 }}>
                                    <Field
                                        label="Quantity"
                                        size="small"
                                        type="number"
                                        value={p.quantity}
                                        onChange={(e: any) => updatePart(sidIdx, partIdx, 'quantity', e.target.value)}
                                    />
                                </Grid>
                                <Grid size={{ xs: 4, sm: 3 }}>
                                    <Button
                                        size="small"
                                        color="error"
                                        disabled={group.parts.length === 1}
                                        onClick={() => removePartRow(sidIdx, partIdx)}
                                    >
                                        Remove
                                    </Button>
                                </Grid>
                            </Grid>
                        ))}

                        <Button size="small" onClick={() => addPartRow(sidIdx)}>
                            + Add Part
                        </Button>
                    </Box>
                ))}

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
                <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                    <Typography variant="body2" color="text.secondary">
                        {lineCount} line{lineCount !== 1 ? 's' : ''} to submit
                    </Typography>
                    <Button variant="outlined" color="inherit" onClick={() => setScreen(0)}>
                        Back
                    </Button>
                    <Button variant="contained" disabled={lineCount === 0} onClick={handleSubmit}>
                        Submit
                    </Button>
                </Box>
            </Box>
        </Paper>
    )

}

export default IOAddOn
