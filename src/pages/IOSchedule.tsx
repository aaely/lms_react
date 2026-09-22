import { useAtom } from 'jotai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../utils/api'
import { ioScreen, editedIo, initialEditedIo, ioForm, lowestDoh, user, exceptionLogForm, type ExceptionLogForm, type PartASL } from '../signals/signals'
import { dockGrid } from '../signals/dockGrid'
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
import IOAddOn from './IOAddOn';
import useInitParts from '../utils/useInitParts';

const STATUS = ["Drop", "Pending", "Tentative", "Confirm", "Unscheduled"];
const EXCEPTION_TYPES = ["IO Container", "IO Offload Drop", "IO Drop", "IO Direct", "Expedite", "Deviation"];
const STATUS_OPTIONS = ["Active", "Expedite"];

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// ScheduleDate isn't saved in one consistent format. Read a leading YYYY-MM-DD as-is —
// new Date() would parse it as UTC midnight and shift it back a day in local time.
const toDateKey = (val: string): string => {
    if (!val) return ''
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(val)
    if (iso) return iso[1]
    const d = new Date(val)
    return isNaN(d.getTime()) ? '' : formatDate(d)
};

const STATUS_FILTERS = ['All', 'Drop', 'Pending', 'Tentative', 'Confirm', 'Unscheduled'];

// Lowest DoH first, unknown DoH last; ties broken by earliest ship date
const byDoh = (a: any, b: any) => {
    if (a.lDoh === b.lDoh) {
        const aShip = a.Schedule?.ShipDate ?? ''
        const bShip = b.Schedule?.ShipDate ?? ''
        if (!aShip || !bShip) return aShip ? -1 : bShip ? 1 : 0
        return aShip.localeCompare(bShip)
    }
    if (a.lDoh === undefined) return 1
    if (b.lDoh === undefined) return -1
    return a.lDoh - b.lDoh
};

// Earliest schedule date then time. ScheduleDate isn't stored in one consistent
// format, so it goes through toDateKey rather than being compared raw. Unscheduled
// trailers have no date and sort last.
const bySchedule = (a: any, b: any) => {
    const aDate = toDateKey(a.Schedule?.ScheduleDate ?? '')
    const bDate = toDateKey(b.Schedule?.ScheduleDate ?? '')
    if (!aDate || !bDate) return aDate ? -1 : bDate ? 1 : 0
    if (aDate !== bDate) return aDate.localeCompare(bDate)
    return String(a.Schedule?.ScheduleTime ?? '').localeCompare(String(b.Schedule?.ScheduleTime ?? ''))
};

// ── Running balance ──────────────────────────────────────────────────────────
const BALANCE_DAYS = 21;

const fmtNum = (v: number | null | undefined): string =>
    v == null ? '—' : Number(v).toLocaleString();

// Day 1 is today, rolling to tomorrow after 22:00 — the same operational
// boundary Scan.tsx uses for its 6-day projection
const getDay1Date = (): Date => {
    const now = new Date();
    const day1 = new Date(now);
    if (now.getHours() >= 22) day1.setDate(day1.getDate() + 1);
    day1.setHours(0, 0, 0, 0);
    return day1;
};

// Column label for day n as MM.DD. Derived by advancing a copy of day1, so it
// rolls into the next month correctly rather than being parsed from a string.
const dayLabel = (day1: Date, n: number): string => {
    const d = new Date(day1);
    d.setDate(d.getDate() + (n - 1));
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// Build the date from its parts so a YYYY-MM-DD string isn't shifted by UTC parsing
const scheduleDateValue = (val: string): number | null => {
    const key = toDateKey(val);
    if (!key) return null;
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
};

// Quantity of `part` arriving on day n, taken from each trailer's scheduled date
// rather than an ASN EDA. Day 1 sweeps up anything scheduled on or before it.
const dayNInbound = (part: string, rows: any[], n: number, day1: Date): number => {
    const date = new Date(day1);
    date.setDate(day1.getDate() + (n - 1));
    const target = date.getTime();

    return rows.reduce((sum: number, trl: any) => {
        const entry = (trl.PartQtys ?? []).find((q: any) => q.part === part);
        if (!entry) return sum;
        // Each quantity carries its own schedule date; fall back to the row's
        const scheduled = scheduleDateValue(entry.scheduleDate || trl.Schedule?.ScheduleDate);
        if (scheduled === null) return sum;
        const arrives = n === 1 ? scheduled <= target : scheduled === target;
        return arrives ? sum + Number(entry.quantity ?? 0) : sum;
    }, 0);
};

// End-of-day-n balance: walk forward from cbal, adding arrivals and subtracting usage
// A typed-in quantity replaces that day's real inbound. Blank means "use the actual",
// so clearing a box always returns the row to reality.
const inboundForDay = (
    part: string, rows: any[], n: number, day1: Date,
    overrides?: Record<string, string>,
): number => {
    const raw = overrides?.[`${part}|${n}`];
    if (raw !== undefined && raw.trim() !== '') {
        const v = Number(raw);
        if (!isNaN(v)) return v;
    }
    return dayNInbound(part, rows, n, day1);
};

// One inbound pass, then a forward prefix sum. Computing each column's balance by
// re-walking days 1..n was triangular — 231 inbound lookups per render instead of 21.
const buildBalanceRows = (
    asl: PartASL, part: string, rows: any[], day1: Date,
    overrides?: Record<string, string>,
): { inbound: number[]; balances: number[] } => {
    const inbound: number[] = [];
    for (let n = 1; n <= BALANCE_DAYS; n++) {
        inbound.push(inboundForDay(part, rows, n, day1, overrides));
    }

    const balances: number[] = [];
    let balance = Number(asl.cbal ?? 0);
    for (let n = 1; n <= BALANCE_DAYS; n++) {
        balance += inbound[n - 1];
        balance -= Number((asl as any)[`day${n}`] ?? 0);
        balances.push(balance);
    }

    return { inbound, balances };
};

const balTh: React.CSSProperties = { padding: '2px 10px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' };
const balTd: React.CSSProperties = { padding: '3px 10px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Blank is allowed; only a filled-in address has to look like one
const isCarrierEmailInvalid = (v?: string) => !!v?.trim() && !EMAIL_RE.test(v.trim());

// IO exception log entries are always filed under COUT; the trailer's actual
// carrier is tracked separately on the Schedule
const EXCEPTION_LOG_SCAC = 'COUT';

const SCHEDULE_REQUIRED: [keyof ExceptionLogForm, string][] = [
    ['newDate', 'New Date'],
    ['newTime', 'New Time'],
    ['newEndDate', 'New End Date'],
    ['newEndTime', 'New End Time'],
];

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        {children}
    </Typography>
);

const Field = (props: any) => <TextField variant="outlined" fullWidth {...props} />;


const IOSchedule = () => {

    const [io, setIo] = useState<any[]>([])
    const [ldoh] = useAtom(lowestDoh)
    // lowestDoh is only filled by useInitParts; without this the page depended on
    // another screen having loaded it earlier in the same browser
    useInitParts()
    const lowestDohAsMap = new Map(Object.entries(ldoh))
    const [screen, setScreen] = useAtom(ioScreen)
    const [e, setE] = useAtom(editedIo)
    const [form, setForm] = useAtom(ioForm)
    const [u] = useAtom(user)
    const [partInput, setPartInput] = useState("");
    const [sidInput, setSidInput]   = useState("");
    const [el, setEl] = useAtom(exceptionLogForm)
    const [dockCount, setDockCount] = useState<number | null>(null)
    const [shiftCount, setShiftCount] = useState<number | null>(null)
    const [hourly, setHourly] = useState<{ hour: string; count: number }[]>([])
    const [statusFilter, setStatusFilter] = useState('All')
    const [dateFilter, setDateFilter] = useState('')
    const [partFilter, setPartFilter] = useState('')
    const [sortMode, setSortMode] = useState<'doh' | 'schedule'>('doh')
    const [aslMap, setAslMap] = useState<Map<string, PartASL>>(new Map())
    const [expandedPart, setExpandedPart] = useState<string | null>(null)
    // Typed values update immediately so the input stays responsive; the debounced
    // copy is what Proj Bal recomputes from, keeping 21 columns of math off each keystroke
    const [inTransitOverrides, setInTransitOverrides] = useState<Record<string, string>>({})
    const [debouncedOverrides, setDebouncedOverrides] = useState<Record<string, string>>({})

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedOverrides(inTransitOverrides), 1000)
        return () => clearTimeout(timeout)
    }, [inTransitOverrides])
    const [scheduleTouched, setScheduleTouched] = useState(false)
    const [carrierScac, setCarrierScac] = useState('')
    const [pendingDelivery, setPendingDelivery] = useState<any | null>(null)
    const [deliveryDate, setDeliveryDate] = useState('')
    const [deliveryError, setDeliveryError] = useState('')
    const [delivering, setDelivering] = useState(false)
    // Row being edited, so returning from a form lands back on it
    const [focusedTrailer, setFocusedTrailer] = useState<string | null>(null)
    const scrolledForRef = useRef<string | null>(null)

    useEffect(() => {
        if (screen !== 0 || !focusedTrailer) return
        // Only scroll once per selection, so an io refetch doesn't yank you back
        if (scrolledForRef.current === focusedTrailer) return
        const row = document.getElementById(`io-row-${focusedTrailer}`)
        if (!row) return
        scrolledForRef.current = focusedTrailer
        row.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [screen, focusedTrailer, io])
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

    const downloadCsv = () => {
        const headers = ['Trailer', 'Status', 'Destination', 'Supplier', 'Scac', 'ScheduleDate', 'ScheduleTime', 'Parts', 'Sids']
        let rows = io.filter(trl => trl.Schedule.Status !== '')
        rows = rows.map(trl => [
            trl.Trailer,
            trl.Schedule.Status,
            trl.Schedule.Destination,
            trl.Schedule.Supplier,
            trl.Schedule.Scac,
            trl.Schedule.ScheduleDate,
            trl.Schedule.ScheduleTime,
            trl.Parts.join(' | '),
            trl.Sids.join(' | ')
        ])

        const csv = [headers, ...rows]
            .map(row => row.map((field: any) => `"${field}"`).join(','))
            .join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `io_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    useEffect(() => {
        const fetchIoData = async () => {
            try {
                const res = await api.get<Array<{ Parts: string[]; Schedule?: { ShipDate?: string } }>>('/api/get_io')
                
                // Sorting happens in visibleIo so the toggle doesn't refetch
                const enriched = res.data
                    .map(item => ({
                        ...item,
                        lDoh: getLDoh(item.Parts)
                    }))

                setIo(enriched)
            } catch (error) {
                console.error('Failed to fetch IO data:', error)
            }
        }

        fetchIoData()
        // ldoh arrives after the first render (storage hydration or the part-routes
        // fetch), so recompute lDoh and the sort when it does
    }, [e, ldoh])

    // cbal, bank and the 21 days of requirements the running balance walks through
    useEffect(() => {
            (async () => {
                try {
                    const res = await api.get<PartASL[]>('/api/get_part_asl')
                    setAslMap(new Map(res.data.map(p => [p.part, p])))
                } catch (error) {
                    console.log(error)
                }
            })()
    },[])

    useEffect(() => {
        const { dock, newDate, newTime } = el
        if (!dock || !newDate || !newTime) return
        const hour = newTime.slice(0, 2)
        ;(async () => {
            try {
                const res = await api.get('/api/dock_count', { params: { date: newDate, hour, dock } })
                const match = res.data.hourly.find((h: { hour: string; count: number }) => h.hour === hour)
                setDockCount(match?.count ?? 0)
                setShiftCount(res.data.shift_total)
                setHourly(res.data.hourly)
            } catch (error) {
                console.log(error)
            }
        })()
    }, [el.dock, el.newDate, el.newTime])

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
            case 4:
                return deliveryConfirm()
            default: break;
        }
    }

    const handleEdit = (entry: any) => {
        setFocusedTrailer(entry.Trailer)
        scrolledForRef.current = null
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
        (id: string) => (ev: React.ChangeEvent<HTMLInputElement>) => {
            switch (id) {
                case 'type': {
                    if (ev.target.value === 'Expedite') {
                        setEl((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: ev.target.value,
                                status: 'Expedite'
                            }
                        })
                        break;
                    } else if (ev.target.value.includes('IO')) {
                        setEl((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: ev.target.value,
                                comment: `${ev.target.value} One Way No Reload | Sids: ${e.Sids.join(', ')}`
                            }
                        })
                        break;
                    } else {
                        setEl((prev: ExceptionLogForm) => {
                            return {
                                ...prev,
                                [id]: ev.target.value,
                                status: 'Active'
                            }
                        })
                        break;
                    }

                }
                default: {
                    handleElChange({ target: { id, value: ev.target.value } } as any)
                    break;
                }
            }

        }
    
    const missingScheduleFields = () => [
        ...(carrierScac.trim() ? [] : ['Carrier SCAC']),
        ...SCHEDULE_REQUIRED
            .filter(([key]) => !String(el?.[key] ?? '').trim())
            .map(([, label]) => label),
    ]

    const carrierScacMissing = scheduleTouched && !carrierScac.trim()

    // Only flag fields after a submit attempt, so a fresh form isn't all red
    const scheduleMissing = (key: keyof ExceptionLogForm) =>
        scheduleTouched && !String(el?.[key] ?? '').trim()

    const handleSubmitSchedule = async () => {
        if (missingScheduleFields().length > 0) {
            setScheduleTouched(true)
            return
        }
        try {
            const sched = {
                // Schedule comments are the trailer's delay/issue notes — keep them.
                // el.comment is the dock instruction and belongs only on the exception log.
                Comments: e.Schedule.Comments ?? '',
                Destination: e.Schedule.Destination,
                OriginalDate: el.originalDate,
                Location: e.Schedule.Location,
                ScheduleDate: el.newDate,
                ScheduleTime: el.newTime,
                Status: e.Schedule.Status === '' || e.Schedule.Status === 'Unscheduled' ? 'Pending' : e.Schedule.Status,
                TrailerID: el.trailer1,
                Supplier: el.supplier,
                Scac: carrierScac.trim(),
                // update_io overwrites every Schedule field, so carry the email through
                CarrierEmail: e.Schedule.CarrierEmail ?? ''
            }
            const updated = {
                Trailer: el.trailer1,
                Sids: e.Sids,
                Parts: e.Parts,
                Schedule: sched
            }
            const updt = {
                ...el,
                scac: EXCEPTION_LOG_SCAC,
                requestor: u.email
            }
            console.log(updated, updt)
            await api.post('/api/update_io', updated)
            /*await withTokenRefresh((token) => 
                trailerApi.pushException(token, [updt])
            )*/
            await api.post('/api/upload_exception', [updt])
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
                                id="carrierScac"
                                label="Carrier SCAC"
                                required
                                error={carrierScacMissing}
                                helperText={carrierScacMissing ? 'Required' : ''}
                                value={carrierScac}
                                onChange={(ev: any) => setCarrierScac(ev.target.value)}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Field
                                id="scac"
                                label="Exception Log SCAC"
                                value={EXCEPTION_LOG_SCAC}
                                disabled
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
                                required
                                error={scheduleMissing('newDate')}
                                helperText={scheduleMissing('newDate') ? 'Required' : ''}
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
                                required
                                error={scheduleMissing('newTime')}
                                helperText={scheduleMissing('newTime') ? 'Required' : ''}
                                type="time"
                                value={el?.newTime ?? ""}
                                onChange={handleElChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        {dockCount !== null && (
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="body1">
                                    Dock count for this hour: <strong>{dockCount}</strong>
                                    &nbsp;&nbsp;Dock count for this shift: <strong>{shiftCount}</strong>
                                </Typography>
                            </Grid>
                        )}
                        {hourly.length > 0 && el.dock && (() => {
                            const dockMap = dockGrid.get(el.dock)
                            const available = hourly.filter(h => {
                                const capacity = dockMap?.get(parseInt(h.hour, 10))
                                return capacity !== undefined && h.count < capacity
                            })
                            return available.length > 0 ? (
                                <Grid size={{ xs: 12 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Available hours: {available.map(h => `${h.hour}:00 (${h.count})`).join(', ')}
                                    </Typography>
                                </Grid>
                            ) : null
                        })()}
                    </Grid>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="newEndDate"
                                label="New End Date"
                                required
                                error={scheduleMissing('newEndDate')}
                                helperText={scheduleMissing('newEndDate') ? 'Required' : ''}
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
                                required
                                error={scheduleMissing('newEndTime')}
                                helperText={scheduleMissing('newEndTime') ? 'Required' : ''}
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
                                label="Dock Instructions"
                                multiline
                                rows={4}
                                value={el?.comment ?? ""}
                                onChange={handleElChange}
                            />
                        </Grid>
                    </Grid>

                    {scheduleTouched && missingScheduleFields().length > 0 && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            Fill in before submitting: {missingScheduleFields().join(', ')}
                        </Typography>
                    )}

                    {/* ── Actions ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                        <Button variant="outlined" color="inherit" onClick={() => setScreen(0)}>
                            Back
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
        setFocusedTrailer(trl.Trailer)
        scrolledForRef.current = null
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
                Location: trl.Schedule.Location,
                ScheduleTime: trl.Schedule.ScheduleTime,
                Status: 'Confirmed',
                CarrierEmail: trl.Schedule.CarrierEmail ?? '',
                // update_io doesn't write this; it keeps the local row's sort key intact
                ShipDate: trl.Schedule.ShipDate ?? '',
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
            const u = { ...updated, lDoh: trl.lDoh }
            await api.post('/api/update_io', updated)
            setIo((prev: any[]) => 
                prev.map(item => item.Trailer === trl.Trailer ? u : item)
            )
        } catch (error) {
            console.log(error)
        }
    }

    const openDeliveryConfirm = (trl: any) => {
        setPendingDelivery(trl)
        setDeliveryDate(formatDate(new Date()))
        setDeliveryError('')
        setScreen(4)
    }

    const cancelDelivery = () => {
        setPendingDelivery(null)
        setDeliveryError('')
        setScreen(0)
    }

    const confirmDelivered = async () => {
        if (!pendingDelivery || !deliveryDate) return
        // YYYY-MM-DD strings compare correctly as text
        if (deliveryDate > formatDate(new Date())) {
            setDeliveryError("Delivery date can't be in the future.")
            return
        }
        setDelivering(true)
        try {
            await api.post(`/api/delivered`, { trailer_id: pendingDelivery.Trailer, delivery_date: deliveryDate })
            setIo(prev => prev.filter(a => a.Trailer !== pendingDelivery.Trailer))
            setPendingDelivery(null)
            setScreen(0)
        } catch (error) {
            console.log(error)
            setDeliveryError('Failed to record the delivery. Try again.')
        } finally {
            setDelivering(false)
        }
    }

    const deliveryConfirm = () => {
        if (!pendingDelivery) return renderTable()
        const trl = pendingDelivery
        return (
            <Paper elevation={2} sx={{ p: 3, maxWidth: 600, mx: "auto", mt: 4, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    Confirm Delivery
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ lineHeight: 2, mb: 3 }}>
                    <div><strong>Trailer:</strong> {trl.Trailer}</div>
                    <div><strong>Destination:</strong> {trl.Schedule.Destination || '—'}</div>
                    <div><strong>Carrier:</strong> {trl.Schedule.Scac || '—'}</div>
                    <div><strong>Scheduled:</strong> {[trl.Schedule.ScheduleDate, trl.Schedule.ScheduleTime].filter(Boolean).join(' ') || '—'}</div>
                    <div><strong>SIDs:</strong> {trl.Sids?.length ? trl.Sids.join(', ') : '—'}</div>
                </Box>

                <Field
                    id="deliveryDate"
                    label="Delivery Date"
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(ev: any) => { setDeliveryDate(ev.target.value); setDeliveryError('') }}
                    error={!deliveryDate || !!deliveryError}
                    helperText={!deliveryDate ? 'Required' : deliveryError}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: formatDate(new Date()) } }}
                />

                <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                    <Button variant="outlined" color="inherit" onClick={cancelDelivery}>
                        Cancel
                    </Button>
                    <Button variant="contained" color="success" disabled={!deliveryDate || delivering} onClick={confirmDelivered}>
                        {delivering ? 'Saving…' : 'Confirm Delivered'}
                    </Button>
                </Box>
            </Paper>
        )
    }

    // Inbound uses every IO trailer with a schedule date, not just the filtered rows
    // Computed for the expanded part only, and keyed on the debounced overrides — so
    // typing a quantity re-renders the input without recomputing 21 columns of math.
    const balanceRows = useMemo(() => {
        if (!expandedPart) return null
        const asl = aslMap.get(expandedPart)
        if (!asl) return null
        return buildBalanceRows(asl, expandedPart, io, getDay1Date(), debouncedOverrides)
    }, [expandedPart, aslMap, io, debouncedOverrides])

    const renderBalance = (part: string) => {
        const asl = aslMap.get(part)
        if (!asl || !balanceRows) {
            return <div style={{ fontSize: 12, color: '#888', padding: '4px 0' }}>No ASL data for {part}</div>
        }
        const day1 = getDay1Date()
        const days = Array.from({ length: BALANCE_DAYS }, (_, i) => i + 1)
        return (
            <div style={{ overflowX: 'auto', margin: '6px 0 10px' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, background: '#fff' }}>
                    <thead>
                        <tr>
                            <th style={balTh}></th>
                            {days.map(n => <th key={n} style={balTh}>{dayLabel(day1, n)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ ...balTh, textAlign: 'left' }}>Req</td>
                            {days.map(n => (
                                <td key={n} style={{ ...balTd, color: '#6b7280' }}>{fmtNum((asl as any)[`day${n}`])}</td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ ...balTh, textAlign: 'left' }}>In Transit</td>
                            {days.map(n => {
                                const key = `${part}|${n}`
                                const actual = balanceRows.inbound[n - 1]
                                const typed = inTransitOverrides[key]
                                const edited = typed !== undefined && typed.trim() !== ''
                                return (
                                    <td key={n} style={{ ...balTd, padding: '2px 4px' }}>
                                        <input
                                            type="number"
                                            value={typed ?? String(actual)}
                                            onChange={ev => setInTransitOverrides(prev => ({ ...prev, [key]: ev.target.value }))}
                                            style={{
                                                width: 58,
                                                textAlign: 'right',
                                                fontSize: 12,
                                                fontWeight: 700,
                                                padding: '2px 3px',
                                                borderRadius: 3,
                                                border: '1px solid #d1d5db',
                                                background: edited ? '#fff3cd' : 'transparent',
                                                color: '#374151',
                                            }}
                                        />
                                    </td>
                                )
                            })}
                        </tr>
                        <tr>
                            <td style={{ ...balTh, textAlign: 'left' }}>Proj Bal</td>
                            {days.map(n => {
                                const bal = balanceRows.balances[n - 1]
                                const color = bal < 0 ? '#b91c1c' : bal < Number(asl.bank ?? 0) ? '#793904' : '#15803d'
                                return <td key={n} style={{ ...balTd, color }}>{fmtNum(bal)}</td>
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        )
    }

    const renderTable = () => {
        // Prefix match: saved statuses mix "Drop"/"Dropped" and "Confirm"/"Confirmed"
        const visibleIo = io.filter((trl: any) => {
            const status = String(trl.Schedule?.Status ?? '').toLowerCase()
            if (statusFilter !== 'All' && !status.startsWith(statusFilter.toLowerCase())) return false
            if (dateFilter && toDateKey(trl.Schedule?.ScheduleDate) !== dateFilter) return false
            // Partial match against any part on the trailer
            const part = partFilter.trim().toUpperCase()
            if (part && !(trl.Parts ?? []).some((p: any) => String(p ?? '').toUpperCase().includes(part))) return false
            return true
        // filter() returns a new array, so sorting it here doesn't mutate io
        }).sort(sortMode === 'doh' ? byDoh : bySchedule)

        return (
            <>
                <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100vh',
                        width: '100%',
                        overflow: 'auto'
                    }}>
                    <a style={{marginLeft: 'auto', marginRight: 'auto'}} onClick={downloadCsv} className="btn btn-info mb-3">Download CSV</a>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
                        <TextField
                            variant="outlined"
                            size="small"
                            label="Status"
                            select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            sx={{ width: 150 }}
                        >
                            {STATUS_FILTERS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </TextField>
                        <TextField
                            variant="outlined"
                            size="small"
                            label="Schedule Date"
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ width: 180 }}
                        />
                        <TextField
                            variant="outlined"
                            size="small"
                            label="Part Number"
                            value={partFilter}
                            onChange={e => setPartFilter(e.target.value)}
                            sx={{ width: 180 }}
                        />
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setSortMode(m => (m === 'doh' ? 'schedule' : 'doh'))}
                        >
                            Sort: {sortMode === 'doh' ? 'Lowest DoH' : 'Schedule Date'}
                        </Button>
                        {(statusFilter !== 'All' || dateFilter || partFilter) &&
                            <Button variant="text" onClick={() => { setStatusFilter('All'); setDateFilter(''); setPartFilter('') }}>
                                Clear
                            </Button>
                        }
                        <span style={{ color: '#666', fontSize: 14 }}>
                            {visibleIo.length} of {io.length} trailer{io.length !== 1 ? 's' : ''}
                        </span>
                    </div>
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
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Current Location</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Original Schedule Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Sids</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Schedule Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Schedule Time</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Ship Date</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Carrier</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Parts</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Lowest DoH</th>
                                            <th style={{ padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap' }}>Delay / Issue Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            visibleIo.map((trl: any, index: number) => {
                                                return (
                                                    <tr
                                                        key={index}
                                                        id={`io-row-${trl.Trailer}`}
                                                        style={{
                                                            backgroundColor: index % 2 !== 0 ? '#dddada' : '#fff',
                                                            outline: focusedTrailer === trl.Trailer ? '2px solid #1976d2' : undefined,
                                                        }}
                                                    >
                                                        <td>{index + 1}</td>
                                                        <td>{trl.Trailer}</td>
                                                        <td>{trl.Schedule.Destination}</td>
                                                        <td>{trl.Schedule.Location}</td>
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
                                                        {/* Raw stored value on purpose — formatting would hide the actual format */}
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>{trl.Schedule.ShipDate}</td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>{trl.Schedule.Scac}</td>
                                                        <td style={{
                                                            backgroundColor: getBg(trl.Schedule.Status)
                                                        }}>
                                                            {trl.Parts.map((p: any, index: number) => {
                                                                const isOpen = expandedPart === p
                                                                return(
                                                                    <div key={`${index}-${p}-${trl.Trailer}`}>
                                                                        {/* div, not p — p's default margins put each entry on its own spaced line */}
                                                                        <div style={{ margin: 0, whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                                                                            <span onClick={() => setExpandedPart(isOpen ? null : p)}
                                                                            style={{ cursor: 'pointer', userSelect: 'none' }}>{isOpen ? '▾' : '▸'}</span> {p} | {lowestDohAsMap.get(p)}
                                                                        </div>
                                                                        {isOpen && renderBalance(p)}
                                                                    </div>
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
                                                            {(trl.Schedule.Status === 'Pending' || trl.Schedule.Status === 'Tentative') &&
                                                                <a onClick={() => handleConfirm(trl)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    Confirm
                                                                </a>
                                                            }
                                                        </td>
                                                        <td>
                                                            {(trl.Schedule.Status === 'Confirmed' ||  trl.Schedule.Status === 'Drop') &&
                                                                <a onClick={() => openDeliveryConfirm(trl)} className="btn btn-info mt-3" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
                                                                    Delivered
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
                carrierEmail: e.Schedule.CarrierEmail || '',
            })
        } 
        if (screen === 2) {
            setScheduleTouched(false)
            setCarrierScac(e.Schedule.Scac || '')
            setEl({
                loadNum: 'IO',
                dock: e.Schedule.Destination === 'Arlington, TX' ? 'V' : 'U',
                dockSequence: e.Schedule.Destination === 'Arlington, TX' ? 'V' : 'U',
                type: 'IO Container',
                status: 'Active',
                route: 'IO',
                scac: 'COUT',
                trailer1: e.Schedule.TrailerID || '',
                trailer2: '',
                supplier: e.Schedule.Supplier,
                originalDate: e.Schedule.OriginalDate.length < 1 ? new Date().toLocaleDateString('en-CA') : e.Schedule.OriginalDate,
                originalTime: '00:00',
                newDate: e.Schedule.ScheduleDate || '',
                newTime: e.Schedule.ScheduleTime || '',
                newEndDate: '',
                newEndTime: '',
                // Dock instructions start from the template, not the trailer's delay notes
                comment: `IO Container One Way No Reload | Sids: ${e.Sids.join(', ')}`,
                isRepower: false,
                repowerLoadNum: '',
            })
        }
    }, [e])

    const getBg = (status: string) => {
        switch (status) {
            case 'Pending':
                return 'yellow'
            case 'Tentative':
                return '#87CEEB'
            case 'Drop':
                return '#FF1493'
            case 'Confirmed':
                return 'limegreen'
            default: return 'inherit'
        }
    }

    const handleSubmit = async () => {
        if (isCarrierEmailInvalid(form.carrierEmail)) return
        // Unscheduling clears the slot and retires the trailer's exception log entry
        const unscheduling = form.status === 'Unscheduled'
        try {
            const sched = {
                Comments: form.comments,
                Destination: form.destination,
                Location: e.Schedule.Location,
                OriginalDate: e.Schedule.OriginalDate,
                ScheduleDate: unscheduling ? '' : e.Schedule.ScheduleDate,
                ScheduleTime: unscheduling ? '' : e.Schedule.ScheduleTime,
                Status: form.status,
                TrailerID: form.trailer,
                Supplier: e.Schedule.Supplier,
                // The backend Schedule has no default for Scac, so leaving it out rejected the save
                Scac: e.Schedule.Scac ?? '',
                CarrierEmail: form.carrierEmail?.trim() ?? ''
            }
            const updated = {
                Trailer: e.Trailer,
                Sids: form.sids,
                Parts: form.parts,
                Schedule: sched
            }
            await api.post('/api/update_io', updated)
            if (unscheduling) {
                // The entry was keyed on Schedule.TrailerID, which update_io has just
                // renamed the node to — e.Trailer is the pre-rename id and may differ
                await api.post('/api/unschedule_io', { trailer: form.trailer })
            }
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
                                label="Delay / Issue Notes"
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

                    <SectionLabel>Carrier</SectionLabel>
                    <Grid container spacing={2} mb={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Field
                                id="carrierEmail"
                                label="Carrier Email"
                                type="email"
                                value={form?.carrierEmail ?? ""}
                                onChange={handleChange}
                                error={isCarrierEmailInvalid(form?.carrierEmail)}
                                helperText={isCarrierEmailInvalid(form?.carrierEmail) ? 'Enter a valid email address' : ''}
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

                    {/* ── Actions ── */}
                    <Divider sx={{ mb: 2 }} />
                    <Box display="flex" justifyContent="flex-end" gap={2}>
                        <Button variant="outlined" color="inherit" onClick={() => setScreen(0)}>
                            Back
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