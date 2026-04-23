import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { type WeekSchedule, type ShiftAssignment, type ShiftSlot, user, type DaySchedule, type SaturdayCount } from '../signals/signals'
import { useAtom } from 'jotai'
import DayDetail from './DayDetail'

const SHIFTS = ['1st', '2nd', '3rd']
const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const getSundayOfWeek = (date: Date): string => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getWeekDates = (startDate: string): string[] => {
    const start = new Date(startDate + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
}

const positionOrder: Record<string, number> = {
    manager:   0,
    floater:   1,
    counts:    2,
    admin:     3,
    traffic:   4,
    receiving: 5,
    mfu:       6,
}

const Scheduler = () => {
    const [week, setWeek]           = useState<WeekSchedule | null>(null)
    const [users, setUsers]         = useState<ShiftAssignment[]>([])
    const [startDate, setStartDate] = useState<string>(getSundayOfWeek(new Date()))
    const [dragging, setDragging]   = useState<ShiftAssignment | null>(null)
    const [loading, setLoading]     = useState(false)
    const [u]                       = useAtom(user)
    const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null)
    const [pendingDrop, setPendingDrop] = useState<{
        date:      string
        shift:     string
        user:      ShiftAssignment
        dayIndex:  number
        task:      string
        task_type: string
    } | null>(null)
    const [hoveredUser, setHoveredUser] = useState<string | null>(null)
    const [saturdayCounts, setSaturdayCounts] = useState<Record<string, SaturdayCount>>({})
    const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null)

    useEffect(() => { fetchUsers() }, [])
    useEffect(() => { fetchWeek() }, [startDate])
    useEffect(() => {
        api.get(`/api/saturday_counts/${startDate}`)
            .then(res => {
                const map: Record<string, SaturdayCount> = {}
                res.data.forEach((c: SaturdayCount) => { map[c.user_name] = c })
                setSaturdayCounts(map)
            })
            .catch(console.error)
    }, [startDate, week])

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/get_users')
            setUsers(res.data)
        } catch (error) {
            console.error('Failed to fetch users:', error)
        }
    }

    const fetchWeek = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/api/get_week/${startDate}`)
            setWeek(res.data)
        } catch (error) {
            console.error('Failed to fetch week:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDrop = (date: string, shift: string, user: ShiftAssignment, dayIndex: number) => {
        setPendingDrop({ date, shift, user, dayIndex, task: '', task_type: 'work' })
    }

    const confirmDrop = async () => {
        if (!pendingDrop) return
        const { date, shift, user, dayIndex, task, task_type } = pendingDrop
        try {
            await api.post('/api/assign_shift', {
                start_date: startDate,
                date,
                offset:    dayIndex,
                shift,
                user_name: user.user_name,
                task,
                task_type
            })
            await fetchWeek()
        } catch (error) {
            console.error('Failed to assign shift:', error)
        } finally {
            setPendingDrop(null)
        }
    }

    const handleUnassign = async (shift: string, user_name: string, dayIndex: number) => {
        try {
            await api.delete('/api/unassign_shift', {
                data: { start_date: startDate, offset: dayIndex, shift, user_name }
            })

            console.log('Unassigning shift:', { start_date: startDate, offset: dayIndex, shift, user_name })
            setWeek(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    days: prev.days.map(day =>
                        day.offset !== dayIndex ? day : {
                            ...day,
                            shifts: day.shifts.map(s =>
                                s.shift !== shift ? s : {
                                    ...s,
                                    assigned: s.assigned.filter(a => a.user_name !== user_name)
                                }
                            )
                        }
                    )
                }
            })
        } catch (error) {
            console.error('Failed to unassign:', error)
        }
    }

    const getShiftCount = (user_name: string): number => {
        if (!week) return 0
        return week.days.reduce((total, day) =>
            total + day.shifts.reduce((t, s) =>
                t + (s.assigned.some(a =>
                    a.user_name === user_name &&
                    (a.task_type === 'work' || a.task_type === 'training')
                ) ? 1 : 0)
            , 0)
        , 0)
    }

    const weekDates    = week ? getWeekDates(week.start_date) : []
    const getShiftSlot = (dayIndex: number, shift: string): ShiftSlot | undefined =>
        week?.days[dayIndex]?.shifts.find(s => s.shift === shift)

    const positionColor = (position: string) => {
        switch (position.toLowerCase()) {
            case 'manager':   return '#d4a017'
            case 'floater':   return '#1f77b4'
            case 'mfu':       return '#2ca02c'
            case 'admin':     return '#f8d303'
            case 'traffic':   return '#03f8cf'
            case 'receiving': return '#031bf8'
            case 'counts':    return '#9603f8'
            case 'bc team':   return '#f80303'
            default:          return '#888'
        }
    }

    const taskColor = (task_type: string) => {
        switch (task_type.toLowerCase()) {
            case 'vacation': return 'rgb(8, 211, 238)'
            case 'leave':    return 'rgb(255, 238, 0)'
            case 'off':      return '#aaa'
            case 'training': return '#5c5e5c'
            case 'work':     return '#4a9a6b'
            default:         return 'inherit'
        }
    }

    const userColor = (username: string) => {
        if (u.email === username) return ['orange', '#1a1a1a']
        return ['#1a1a1a', 'white']
    }

    const getBg = (shiftCount: number) => {
        if (shiftCount > 5) return ['yellow', 'black']
        return ['inherit', 'white']
    }

    const getPositionCounts = (slot: ShiftSlot | undefined) => {
        if (!slot) return { manager: 0, floater: 0, traffic: 0, receiving: 0, mfu: 0, admin: 0, counts: 0, off: 0 }
        return slot.assigned.reduce((acc, a) => {
            if (a.task_type !== 'work' && a.task_type !== 'training') {
                return { ...acc, off: acc.off + 1 }
            }
            const pos = a.position?.toLowerCase() ?? ''
            return {
                ...acc,
                [pos]: (acc[pos as keyof typeof acc] ?? 0) + 1
            }
        }, { manager: 0, floater: 0, traffic: 0, receiving: 0, mfu: 0, admin: 0, counts: 0, off: 0 })
    }

    return (
        <div style={{ display: 'flex', gap: 16, padding: 16, height: '100vh', overflow: 'hidden' }}>

            {/* ── Task Modal ── */}
            {pendingDrop && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 999
                }}>
                    <div style={{
                        background: '#1a1a1a', border: '1px solid #444', borderRadius: 8,
                        padding: 24, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 12
                    }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                            Assign {pendingDrop.user.user_name} to {pendingDrop.shift} Shift
                        </div>
                        <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                            {pendingDrop.date} — {pendingDrop.shift} shift
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['work', 'vacation', 'off', 'leave', 'training'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setPendingDrop(prev => prev ? { ...prev, task_type: type } : null)}
                                    style={{
                                        ...navBtn,
                                        flex: 1,
                                        background: pendingDrop.task_type === type
                                            ? type === 'vacation' ? '#5a2a2a' : '#2a5a2a'
                                            : '#2a2a2a',
                                        borderColor: pendingDrop.task_type === type
                                            ? type === 'vacation' ? '#9a4a4a' : '#4a9a4a'
                                            : '#555',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <textarea
                            autoFocus
                            placeholder="Enter task or assignment notes..."
                            value={pendingDrop.task}
                            onChange={e => setPendingDrop(prev => prev ? { ...prev, task: e.target.value } : null)}
                            style={{
                                background: '#2a2a2a', border: '1px solid #555', borderRadius: 4,
                                color: '#fff', padding: '8px', fontSize: '0.85rem',
                                resize: 'vertical', minHeight: 80, width: '100%'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => setPendingDrop(null)} style={navBtn}>
                                Cancel
                            </button>
                            <button
                                onClick={confirmDrop}
                                style={{ ...navBtn, background: '#2a5a2a', borderColor: '#4a9a4a', color: '#fff' }}
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DayDetail Modal ── */}
            {selectedDay && (
                <DayDetail
                    day={selectedDay}
                    startDate={startDate}
                    onClose={() => setSelectedDay(null)}
                />
            )}

            {/* ── User Panel ── */}
            <div style={{
                width: 180, flexShrink: 0, background: '#1a1a1a', borderRadius: 6,
                padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8
            }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                    Users
                </div>
                {users.sort((a,b) => {
                    return (positionOrder[a.position?.toLowerCase()] ?? 99) -
                    (positionOrder[b.position?.toLowerCase()] ?? 99)
                }).map(user => (
                    <div
                        key={user.user_name}
                        draggable
                        onDragStart={() => setDragging(user)}
                        onDragEnd={() => setDragging(null)}
                        onMouseEnter={e => {
                            setHoveredUser(user.user_name)
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            setTooltipPos({ x: rect.right + 8, y: rect.top })
                        }}
                        onMouseLeave={() => {
                            setHoveredUser(null)
                            setTooltipPos(null)
                        }}
                        style={{
                            background: getBg(getShiftCount(user.user_name))[0], border: `2px solid ${positionColor(user.position)}`,
                            color: getBg(getShiftCount(user.user_name))[1],
                            borderRadius: 4, padding: '6px 8px', cursor: 'grab', fontSize: '0.8rem',
                        }}
                    >
                        <div style={{ fontWeight: 600 }}>{user.user_name}</div>
                        <div style={{ color: positionColor(user.position), fontSize: '0.7rem' }}>{user.position}</div>
                        <div style={{ color: '#aaa', fontSize: '0.7rem', marginTop: 2 }}>
                            {getShiftCount(user.user_name)} shift{getShiftCount(user.user_name) !== 1 ? 's' : ''} this week
                        </div>
                        {/* ── Saturday Tooltip ── */}
                        {hoveredUser === user.user_name && saturdayCounts[user.user_name] && (
                            <div style={{
                                position: 'fixed',
                                left: tooltipPos?.x,
                                top: tooltipPos?.y,
                                background: '#1a1a2e',
                                border: '1px solid #444',
                                borderRadius: 4,
                                padding: '8px 10px',
                                minWidth: 160,
                                fontSize: '0.75rem',
                                color: '#fff',
                                zIndex: 9999,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                pointerEvents: 'none',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 4 }}>Last 5 Weeks</div>
                                <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: 4 }}>Saturdays</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ color: '#aaa' }}>Worked:</span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: saturdayCounts[hoveredUser].saturdays_worked >= 4 ? '#f55'
                                            : saturdayCounts[hoveredUser].saturdays_worked >= 3 ? '#f90'
                                            : '#4a9a4a'
                                    }}>
                                        {saturdayCounts[hoveredUser].saturdays_worked}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ color: '#aaa' }}>Off:</span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: saturdayCounts[hoveredUser].saturdays_off === 0 ? '#f55' : '#4a9a4a'
                                    }}>
                                        {saturdayCounts[hoveredUser].saturdays_off}
                                    </span>
                                </div>
                                <div style={{ color: '#888', fontSize: '0.7rem', margin: '6px 0 4px' }}>Mondays</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ color: '#aaa' }}>Worked:</span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: saturdayCounts[hoveredUser].mondays_worked >= 4 ? '#f55'
                                            : saturdayCounts[hoveredUser].mondays_worked >= 3 ? '#f90'
                                            : '#4a9a4a'
                                    }}>
                                        {saturdayCounts[hoveredUser].mondays_worked}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                    <span style={{ color: '#aaa' }}>Off:</span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: saturdayCounts[hoveredUser].mondays_off === 0 ? '#f55' : '#4a9a4a'
                                    }}>
                                        {saturdayCounts[hoveredUser].mondays_off}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ── Schedule Grid ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* ── Week Picker ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <button
                        onClick={() => {
                            const d = new Date(startDate + 'T00:00:00')
                            d.setDate(d.getDate() - 7)
                            setStartDate(getSundayOfWeek(d))
                        }}
                        style={navBtn}
                    >← Prev</button>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(getSundayOfWeek(new Date(e.target.value + 'T00:00:00')))}
                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #555', background: '#1a1a1a', color: '#fff' }}
                    />
                    <button
                        onClick={() => {
                            const d = new Date(startDate + 'T00:00:00')
                            d.setDate(d.getDate() + 7)
                            setStartDate(getSundayOfWeek(d))
                        }}
                        style={navBtn}
                    >Next →</button>
                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Week of {startDate}</span>
                    <button
                        onClick={async () => {
                            try {
                                await api.post(`/api/generate_week/${startDate}`)
                                await fetchWeek()
                            } catch (error) {
                                console.error('Failed to generate week:', error)
                            }
                        }}
                        style={{ ...navBtn, background: '#2a5a2a', borderColor: '#4a9a4a', color: '#fff' }}
                    >
                        Generate Week
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                await api.delete(`/api/restart_week/${startDate}`)
                                await fetchWeek()
                            } catch (error) {
                                console.error('Failed to generate week:', error)
                            }
                        }}
                        style={{ ...navBtn, background: '#f80202', borderColor: '#000000', color: '#000000' }}
                    >
                        Reset Week
                    </button>
                </div>

                {loading && <div style={{ color: '#aaa' }}>Loading...</div>}

                {/* ── Grid ── */}
                <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                        <thead>
                            <tr>
                                <th style={{width: 40, textAlign: 'center' }}>Shift</th>
                                {DAYS.map((day, i) => (
                                    <th key={day} style={th}>
                                        <div>{day}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#aaa', fontWeight: 400 }}>
                                            {weekDates[i] ?? ''}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SHIFTS.map(shift => (
                                <tr key={shift}>
                                    <td style={{ ...td, fontWeight: 700, background: '#111', color: '#fff', whiteSpace: 'nowrap', verticalAlign: 'middle', maxWidth: 10, textAlign: 'center' }}>
                                        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'inline-block' }}>
                                            {shift} Shift
                                        </span>
                                    </td>
                                    {DAYS.map((_, dayIndex) => {
                                        const slot = getShiftSlot(dayIndex, shift)
                                        const date = weekDates[dayIndex]

                                        return (
                                            <td
                                                key={dayIndex}
                                                onClick={() => {
                                                    if (!dragging && week?.days[dayIndex]) {
                                                        setSelectedDay(week.days[dayIndex])
                                                    }
                                                }}
                                                onDragOver={e => e.preventDefault()}
                                                onDrop={() => {
                                                    if (dragging && date) handleDrop(date, shift, dragging, dayIndex)
                                                }}
                                                style={{
                                                    ...td,
                                                    width: `${100 / 7}%`,
                                                    wordBreak: 'break-word',
                                                    minHeight: 320,
                                                    verticalAlign: 'top',
                                                    background: slot?.shift_status === 'holiday' ? '#2a1a1a'
                                                                : dragging ? '#1a2a1a'
                                                                : '#fafafa',
                                                    transition: 'background 0.15s',
                                                    cursor: slot?.shift_status === 'holiday' ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                {!slot?.shift_status || slot?.shift_status.toLowerCase() === 'active' ?
                                                    (<div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 4 }}>
                                                    {slot?.assigned.sort((a, b) => {
                                                        const posDiff = (positionOrder[a.position?.toLowerCase()] ?? 99) -
                                                                        (positionOrder[b.position?.toLowerCase()] ?? 99)
                                                        if (posDiff !== 0) return posDiff
                                                        return (a.full_name ?? '').localeCompare(b.full_name ?? '')
                                                    }).map(a => (
                                                        <div
                                                            key={a.user_name}
                                                            style={{
                                                                backgroundColor: `${taskColor(a.task_type)}`,
                                                                border: `10px solid ${positionColor(a.position)}`,
                                                                borderRadius: 4,
                                                                padding: '3px 6px',
                                                                fontSize: '1.0rem',
                                                                color: 'black',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: 2
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span style={{ fontWeight: 600 }}>{a.full_name}</span>
                                                                <span
                                                                    onClick={e => {
                                                                        e.stopPropagation()
                                                                        handleUnassign(shift, a.user_name, dayIndex)
                                                                    }}
                                                                    style={{ cursor: 'pointer', color: '#f55', fontSize: '.8rem' }}
                                                                >✕</span>
                                                                <span>{a.position}</span>
                                                                <span
                                                                    onClick={e => {
                                                                        e.stopPropagation()
                                                                        setPendingDrop({ date, shift, user: a, dayIndex, task: '', task_type: 'work' })
                                                                    }}
                                                                    style={{ cursor: 'pointer', color: 'rgb(121, 250, 16)', fontSize: '.8rem' }}
                                                                >Edit</span>
                                                            </div>
                                                            {a.task && (
                                                                <div style={{ color: userColor(a.user_name)[1], fontSize: '.8rem', fontStyle: 'italic' }}>
                                                                    {a.task}
                                                                </div>
                                                            )}
                                                            {a.task_type !== 'work' && (
                                                                <span style={{ fontSize: '.8rem', color: '#f55', fontWeight: 700 }}>{a.task_type.toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {(() => {
                                                        const { manager, floater, traffic, receiving, mfu, admin, counts, off } = getPositionCounts(slot)
                                                        return (
                                                            <div style={{ fontSize: '0.65rem', color: '#888', marginTop: 4, borderTop: '1px solid #ddd', paddingTop: 4 }}>
                                                                {manager   > 0 && <span style={{ marginRight: 6 }}>MGR: {manager}</span>}
                                                                {floater   > 0 && <span style={{ marginRight: 6 }}>FLT: {floater}</span>}
                                                                {traffic   > 0 && <span style={{ marginRight: 6 }}>TRF: {traffic}</span>}
                                                                {admin     > 0 && <span style={{ marginRight: 6 }}>ADM: {admin}</span>}
                                                                {counts    > 0 && <span style={{ marginRight: 6 }}>CNT: {counts}</span>}
                                                                {receiving > 0 && <span style={{ marginRight: 6 }}>RCV: {receiving}</span>}
                                                                {mfu       > 0 && <span>MFU: {mfu}</span>}
                                                                {off       > 0 && <span style={{ marginRight: 6 }}>OFF: {off}</span>}
                                                            </div>
                                                        )
                                                    })()}
                                                </div>)
                                                :
                                                (
                                                <div style={{
                                                            display: 'flex', flexDirection: 'column',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            height: '100%', gap: 4, padding: 8
                                                        }}>
                                                            <span style={{ fontSize: '1.2rem' }}>🚫</span>
                                                            <span style={{ color: '#f55', fontWeight: 700, fontSize: '0.8rem' }}>
                                                                {slot?.shift_reason || 'Holiday'}
                                                            </span>
                                                </div>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const th: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 2,
}

const td: React.CSSProperties = {
    padding: '6px',
    border: '1px solid #ddd',
    verticalAlign: 'top',
}

const navBtn: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 4,
    border: '1px solid #555',
    background: '#1a1a1a',
    color: '#fff',
    cursor: 'pointer',
}

export default Scheduler