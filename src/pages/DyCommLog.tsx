import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { dyCommLogForm, user, type DyCommLogForm, type DyCommLog, dyCommLog } from "../signals/signals"
//import { parse } from 'date-fns'
import {
    Box,
    Button,
    Divider,
    Grid,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { trailerApi } from "../../netlify/functions/trailerApi";


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


const DyLog = () => {
    const [u, setU] = useAtom(user)
    const [form, setForm] = useAtom(dyCommLogForm)
    const [view, setView] = useState(0)
    const [entries, setEntries] = useState<DyCommLog[]>([])
    const [edited, setEdited] = useAtom(dyCommLog)

    const handleChange = ({target: { id, value}}: any) => {
        switch (id) {
            default: {
                setForm((prev: DyCommLogForm) => ({ ...prev, [id]: value }));
                break;
            }
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const res = await trailerApi.getDyEntries(u.accessToken)
                setEntries(res.exceptions)
            } catch (error) {
                console.log(error)
            }
        })()
    },[view])

    useEffect(() => {
        setForm({
            ...edited,
            deliveryDate: formatDate(new Date(edited.deliveryDate))
        })
    },[edited])

    const handleReset = () => {
        // TODO: reset atom to initial state
    };

    const handleEdit = (entry: DyCommLog) => {
        setEdited({ ...entry })
        setView(prev => prev === 0 ? 1 : 0)
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

    const handleSubmit = async () => {
            try {
                let entry = {...form, createdBy: u.email}
                await trailerApi.pushDy(u.accessToken, [entry])
                setView(prev => prev === 0 ? 1 : 0)
            } catch (error) {
                console.log(error)
            }
    };

    const renderForm = () => {
        return (
            <>
                <Paper elevation={2} sx={{ p: 3, maxWidth: 900, mx: "auto", borderRadius: 2 }}>
                    {/* ── Header ── */}
                    <Typography onClick={() => setView(prev => prev === 0 ? 1 : 0)} variant="h6" fontWeight={700} gutterBottom>
                        DY Communication Log
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
                        </Grid>
                        <SectionLabel>At DY/DY ETA</SectionLabel>
                        <Grid container spacing={2} mb={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Field
                                    id="location"
                                    label="Location"
                                    value={form?.location ?? ""}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </Grid>
    
                        {/* ── Trailers & Supplier ── */}
                        <SectionLabel>Trailers &amp; Supplier</SectionLabel>
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
                                    id="supplier"
                                    label="Supplier"
                                    value={form?.supplier ?? ""}
                                    onChange={handleChange}
                                />
                            </Grid>
                        </Grid>
    
                        {/* ── New Schedule ── */}
                        <SectionLabel>Schedule Time</SectionLabel>
                        <Grid container spacing={2} mb={3}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Field
                                    id="deliveryDate"
                                    label="New Date"
                                    type="date"
                                    value={form?.deliveryDate ?? ""}
                                    onChange={handleChange}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Field
                                    id="deliveryTime"
                                    label="New Time"
                                    type="time"
                                    value={form?.deliveryTime ?? ""}
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
            </>
        )
    }

    const renderLog = () => {
        return (
            <>
                <div style={{
                    display: 'flex',
                    width: '90vw',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column'
                }}>
                    <h1 onClick={() => setView(prev => prev === 0 ? 1 : 0)}>
                        DY Communication Log Entries
                    </h1>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {[
                                    '#', 'Load #', 'Route', 'Scac', 'Trailer', 'Dock',
                                    'Location', 'Delivery Date', 'Delivery Time', 'Supplier', 'Part',
                                    'PDT', 'Requestor'
                                ].map((header, i) => (
                                    <th key={i} style={{
                                        position: 'sticky',
                                        top: 0,
                                        backgroundColor: '#f5f5f5',  // Light gray background
                                        color: '#333',
                                        padding: '12px',
                                        borderBottom: '2px solid #333',
                                        borderTop: '1px solid #ddd',
                                        whiteSpace: 'nowrap',
                                        zIndex: 10,
                                        boxShadow: 'inset 0 -1px 0 #ddd',  // Clean bottom border
                                        textAlign: 'center',
                                        fontWeight: '600'
                                    }}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry: DyCommLog, index: number) => {
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
                                            {entry.trailer}
                                        </td>
                                        <td>
                                            {entry.dock}
                                        </td>
                                        <td>
                                            {entry.location}
                                        </td>
                                        <td>
                                            {new Date(entry.deliveryDate).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {entry.deliveryTime}
                                        </td>
                                        <td>
                                            {entry.supplier}
                                        </td>
                                        <td>
                                            {entry.part}
                                        </td>
                                        <td>
                                            {entry.pdt}
                                        </td>
                                        <td>
                                            {entry.createdBy}
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
            </>
        )
    }

    return (
        <>
            {view === 0 ? renderForm() : renderLog()}
        </>
    )

}

export default DyLog