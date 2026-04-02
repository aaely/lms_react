import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { type DayDetailProps, type ShiftDetail } from '../signals/signals'

const DayDetail = ({ day, startDate, onClose }: DayDetailProps) => {
    const [details, setDetails]     = useState<ShiftDetail[]>([])
    const [loading, setLoading]     = useState(false)
    const [draggingDeck, setDraggingDeck] = useState<string | null>(null)
    const [activeShift, setActiveShift]   = useState<string>('1st')
    const [decks, setDecks] = useState<string[]>([])

    useEffect(() => {
        fetchDetails()
        fetchDecks()
    }, [day])

    const fetchDetails = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/api/get_shift_detail/${startDate}/${day.offset}`)
            setDetails(res.data)
        } catch (error) {
            console.error('Failed to fetch shift details:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDecks = async () => {
        try {
            const res = await api.get('/api/get_decks')
            setDecks(res.data)
        } catch (error) {
            console.error('Failed to fetch decks:', error)
        }
    }

    const handleDeckDrop = async (deck: string, user_name: string, shift: string) => {
        const day_key = `${startDate}_${day.offset}`

        // Optimistic update
        setDetails(prev => prev.map(s => {
            if (s.shift !== shift) return s
            const existing = s.deck_coverage.find(c => c.deck === deck)
            if (existing) {
                return {
                    ...s,
                    deck_coverage: s.deck_coverage.map(c =>
                        c.deck === deck ? { ...c, user_name } : c
                    )
                }
            }
            return {
                ...s,
                deck_coverage: [...s.deck_coverage, { deck, user_name }]
            }
        }))

        try {
            await api.post('/api/assign_deck', {
                day_key,
                shift,
                deck,
                user_name
            })
        } catch (error) {
            console.error('Failed to assign deck:', error)
            fetchDetails()
        }
    }

    const handleUnassignDeck = async (deck: string, shift: string) => {
        const day_key = `${startDate}_${day.offset}`

        // Optimistic update
        setDetails(prev => prev.map(s => {
            if (s.shift !== shift) return s
            return {
                ...s,
                deck_coverage: s.deck_coverage.map(c =>
                    c.deck === deck ? { ...c, user_name: null } : c
                )
            }
        }))

        try {
            await api.delete('/api/unassign_deck', {
                data: { day_key, shift, deck }
            })
        } catch (error) {
            console.error('Failed to unassign deck:', error)
            fetchDetails()
        }
    }

    const currentShift = details.find(s => s.shift === activeShift)

    const getDeckUser = (deck: string): string | null =>
        currentShift?.deck_coverage.find(c => c.deck === deck)?.user_name ?? null

    const getUserDecks = (user_name: string): string[] =>
        currentShift?.deck_coverage.filter(c => c.user_name === user_name).map(c => c.deck) ?? []

    const uncoveredDecks = decks.filter(d => !getDeckUser(d))
    const coveredDecks   = decks.filter(d =>  getDeckUser(d))

    const positionColor = (position: string) => {
        switch (position) {
            case 'Manager': return '#d4a017'
            case 'Floater': return '#1f77b4'
            case 'MFU':     return '#2ca02c'
            default:        return '#888'
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999
        }}>
            <div style={{
                background: '#1a1a1a', border: '1px solid #444', borderRadius: 8,
                width: '90vw', maxWidth: 1100, height: '85vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* ── Header ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: '1px solid #333'
                }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                        {day.name} — {day.date}
                    </div>
                    <button onClick={onClose} style={{ ...btnStyle, color: '#f55', borderColor: '#f55' }}>
                        ✕ Close
                    </button>
                </div>

                {/* ── Shift Tabs ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex' }}>
                    {['1st', '2nd', '3rd'].map(shift => (
                        <button
                            key={shift}
                            onClick={() => setActiveShift(shift)}
                            style={{
                                ...btnStyle,
                                borderRadius: 0,
                                border: 'none',
                                borderBottom: activeShift === shift ? '2px solid #4a9a4a' : '2px solid transparent',
                                background: activeShift === shift ? '#2a2a2a' : 'transparent',
                                color: activeShift === shift ? '#fff' : '#aaa',
                                padding: '10px 24px',
                                fontSize: '0.9rem',
                            }}
                        >
                            {shift} Shift
                        </button>
                    ))}
                </div>

                {/* ── Shift Status ── */}
                <div style={{ display: 'flex', gap: 8, paddingRight: 12 }}>
                    {['active', 'holiday', 'closed'].map(status => {
                        const current = details.find(s => s.shift === activeShift)?.shift_status ?? 'active'
                        return (
                            <button
                                key={status}
                                onClick={async () => {
                                    const reason = status !== 'active'
                                        ? prompt(`Enter reason for ${status} (e.g. Christmas):`) ?? ''
                                        : ''
                                    await api.post('/api/set_shift_status', {
                                        start_date: startDate,
                                        offset:     day.offset,
                                        shift:      activeShift,
                                        status,
                                        reason
                                    })
                                    fetchDetails()
                                }}
                                style={{
                                    ...btnStyle,
                                    fontSize: '0.75rem',
                                    background: current === status
                                        ? status === 'active' ? '#2a5a2a' : '#5a2a2a'
                                        : 'transparent',
                                    borderColor: current === status
                                        ? status === 'active' ? '#4a9a4a' : '#9a4a4a'
                                        : '#555',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {status}
                            </button>
                        )
                    })}
                </div>
            </div>

                {loading ? (
                    <div style={{ color: '#aaa', padding: 16 }}>Loading...</div>
                ) : (
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                        {/* ── Left: Deck Pool ── */}
                        <div style={{
                            width: 220, flexShrink: 0, borderRight: '1px solid #333',
                            padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8
                        }}>
                            {/* Uncovered */}
                            <div style={{ color: '#f55', fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>
                                Uncovered ({uncoveredDecks.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                                {uncoveredDecks.map(deck => (
                                    <div
                                        key={deck}
                                        draggable
                                        onDragStart={() => setDraggingDeck(deck)}
                                        onDragEnd={() => setDraggingDeck(null)}
                                        style={{
                                            padding: '3px 8px', borderRadius: 4,
                                            border: '1px solid #f55', background: '#2a1a1a',
                                            color: '#f55', fontSize: '0.75rem', cursor: 'grab',
                                            fontWeight: 600
                                        }}
                                    >
                                        {deck}
                                    </div>
                                ))}
                            </div>

                            {/* Covered */}
                            <div style={{ color: '#4a9a4a', fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>
                                Covered ({coveredDecks.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {coveredDecks.map(deck => (
                                    <div
                                        key={deck}
                                        draggable
                                        onDragStart={() => setDraggingDeck(deck)}
                                        onDragEnd={() => setDraggingDeck(null)}
                                        style={{
                                            padding: '3px 8px', borderRadius: 4,
                                            border: '1px solid #4a9a4a', background: '#1a2a1a',
                                            color: '#4a9a4a', fontSize: '0.75rem', cursor: 'grab',
                                            fontWeight: 600
                                        }}
                                    >
                                        {deck}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Right: User Columns ── */}
                        <div style={{ flex: 1, display: 'flex', overflowX: 'auto', padding: 12, gap: 12 }}>
                            {currentShift?.assigned.length === 0 && (
                                <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                    No users assigned to this shift yet.
                                </div>
                            )}
                            {currentShift?.assigned.map(user => (
                                <div
                                    key={user.user_name}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={() => {
                                        if (draggingDeck) handleDeckDrop(draggingDeck, user.user_name, activeShift)
                                    }}
                                    style={{
                                        minWidth: 160, flex: 1,
                                        background: draggingDeck ? '#1a2a1a' : '#2a2a2a',
                                        border: `1px solid ${positionColor(user.position)}`,
                                        borderRadius: 6, padding: 10,
                                        display: 'flex', flexDirection: 'column', gap: 6,
                                        transition: 'background 0.15s'
                                    }}
                                >
                                    {/* User Header */}
                                    <div style={{ borderBottom: '1px solid #444', paddingBottom: 6 }}>
                                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                                            {user.user_name}
                                        </div>
                                        <div style={{ color: positionColor(user.position), fontSize: '0.7rem' }}>
                                            {user.position}
                                        </div>
                                        {user.task && (
                                            <div style={{ color: '#aaa', fontSize: '0.7rem', fontStyle: 'italic', marginTop: 2 }}>
                                                {user.task}
                                            </div>
                                        )}
                                        {user.task_type === 'vacation' && (
                                            <span style={{ fontSize: '0.65rem', color: '#f55', fontWeight: 700 }}>VAC</span>
                                        )}
                                    </div>

                                    {/* Assigned Decks */}
                                    <div style={{ color: '#aaa', fontSize: '0.7rem', marginBottom: 2 }}>
                                        Decks ({getUserDecks(user.user_name).length})
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1 }}>
                                        {getUserDecks(user.user_name).map(deck => (
                                            <div
                                                key={deck}
                                                style={{
                                                    padding: '2px 6px', borderRadius: 3,
                                                    border: '1px solid #4a9a4a', background: '#1a3a1a',
                                                    color: '#4a9a4a', fontSize: '0.7rem',
                                                    display: 'flex', alignItems: 'center', gap: 4
                                                }}
                                            >
                                                {deck}
                                                <span
                                                    onClick={() => handleUnassignDeck(deck, activeShift)}
                                                    style={{ cursor: 'pointer', color: '#f55', fontSize: '0.65rem' }}
                                                >✕</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Drop hint */}
                                    {draggingDeck && (
                                        <div style={{ color: '#4a9a4a', fontSize: '0.7rem', textAlign: 'center', marginTop: 4 }}>
                                            Drop here
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const btnStyle: React.CSSProperties = {
    padding: '4px 12px', borderRadius: 4,
    border: '1px solid #555', background: 'transparent',
    color: '#fff', cursor: 'pointer', fontSize: '0.85rem'
}

export default DayDetail