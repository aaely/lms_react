import { useState, useEffect, useMemo } from 'react'
import { api } from '../utils/api'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'

interface Contact {
    email: string
    name:  string
    phone: string
    duns:  string
    scac:  string
}

interface PartASL {
    duns:     string
    supplier: string
}

interface DunsOption {
    duns:     string
    supplier: string
}

type Mode = 'duns' | 'carrier'

const emptyForm = { email: '', name: '', phone: '' }

const ManageContacts = () => {
    const [u]                 = useAtom(user)
    const [mode,          setMode]          = useState<Mode>('duns')
    const [dunsOptions,   setDunsOptions]   = useState<DunsOption[]>([])
    const [carrierOptions,setCarrierOptions]= useState<string[]>([])
    const [keyFilter,     setKeyFilter]     = useState('')
    const [selectedDuns,  setSelectedDuns]  = useState<string | null>(null)
    const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
    const [contacts,      setContacts]      = useState<Contact[]>([])
    const [loadingKeys,   setLoadingKeys]   = useState(true)
    const [loadingContacts, setLoadingContacts] = useState(false)
    const [edited,        setEdited]        = useState<Record<string, Contact>>({})
    const [saving,        setSaving]        = useState<Record<string, boolean>>({})
    const [newContact,    setNewContact]    = useState(emptyForm)
    const [adding,        setAdding]        = useState(false)
    const [error,         setError]         = useState('')

    const selectedKey = mode === 'duns' ? selectedDuns : selectedCarrier

    useEffect(() => {
        (async () => {
            try {
                setLoadingKeys(true)
                const [aslRes, carrierRes] = await Promise.all([
                    api.get<PartASL[]>('/api/get_part_asl'),
                    api.get<string[]>('/api/get_carriers'),
                ])
                const seen = new Map<string, string>()
                aslRes.data.forEach(p => {
                    if (p.duns && !seen.has(p.duns)) seen.set(p.duns, p.supplier)
                })
                const options = Array.from(seen.entries())
                    .map(([duns, supplier]) => ({ duns, supplier }))
                    .sort((a, b) => a.duns.localeCompare(b.duns))
                setDunsOptions(options)
                setCarrierOptions(carrierRes.data)
            } catch (err) {
                console.error('Failed to fetch DUNS/carrier lists:', err)
            } finally {
                setLoadingKeys(false)
            }
        })()
    }, [])

    useEffect(() => {
        if (!selectedKey) { setContacts([]); return }
        setEdited({})
        setNewContact(emptyForm)
        setError('')
        ;(async () => {
            try {
                setLoadingContacts(true)
                const res = await api.get<Contact[]>('/api/get_contacts')
                setContacts(res.data.filter(c => mode === 'duns' ? c.duns === selectedKey : c.scac === selectedKey))
            } catch (err) {
                console.error('Failed to fetch contacts:', err)
            } finally {
                setLoadingContacts(false)
            }
        })()
    }, [mode, selectedKey])

    const filteredDunsOptions = useMemo(() => {
        const f = keyFilter.trim().toLowerCase()
        if (!f) return dunsOptions
        return dunsOptions.filter(o => o.duns.toLowerCase().includes(f) || o.supplier.toLowerCase().includes(f))
    }, [dunsOptions, keyFilter])

    const filteredCarrierOptions = useMemo(() => {
        const f = keyFilter.trim().toLowerCase()
        if (!f) return carrierOptions
        return carrierOptions.filter(scac => scac.toLowerCase().includes(f))
    }, [carrierOptions, keyFilter])

    const canEdit = u.role === 'admin' || u.role === 'manager'

    const getRow = (contact: Contact): Contact => edited[contact.email] ?? contact

    const handleChange = (email: string, field: 'name' | 'phone', value: string) => {
        setEdited(prev => ({
            ...prev,
            [email]: {
                ...(prev[email] ?? contacts.find(c => c.email === email)!),
                [field]: value,
            },
        }))
    }

    const isDirty = (email: string) => !!edited[email]

    const handleSave = async (email: string) => {
        const row = edited[email]
        if (!row || !selectedKey) return
        setSaving(prev => ({ ...prev, [email]: true }))
        try {
            await api.post('/api/update_contact', row)
            setContacts(prev => prev.map(c => c.email === email ? row : c))
            setEdited(prev => {
                const next = { ...prev }
                delete next[email]
                return next
            })
        } catch (err) {
            console.error('Failed to save contact:', err)
            setError('Failed to save contact')
        } finally {
            setSaving(prev => ({ ...prev, [email]: false }))
        }
    }

    const handleDiscard = (email: string) => {
        setEdited(prev => {
            const next = { ...prev }
            delete next[email]
            return next
        })
    }

    const handleDelete = async (email: string) => {
        if (!confirm(`Remove contact ${email}?`)) return
        try {
            await api.delete('/api/delete_contact', { data: { email } })
            setContacts(prev => prev.filter(c => c.email !== email))
        } catch (err) {
            console.error('Failed to delete contact:', err)
            setError('Failed to delete contact')
        }
    }

    const handleAdd = async () => {
        if (!selectedKey) return
        if (!newContact.email.trim()) {
            setError('Email is required')
            return
        }
        if (contacts.some(c => c.email === newContact.email.trim())) {
            setError('A contact with that email already exists')
            return
        }
        setAdding(true)
        setError('')
        try {
            const contact: Contact = {
                ...newContact,
                email: newContact.email.trim(),
                duns:  mode === 'duns'    ? selectedKey : '',
                scac:  mode === 'carrier' ? selectedKey : '',
            }
            await api.post('/api/update_contact', contact)
            setContacts(prev => [...prev, contact])
            setNewContact(emptyForm)
        } catch (err) {
            console.error('Failed to add contact:', err)
            setError('Failed to add contact')
        } finally {
            setAdding(false)
        }
    }

    if (!canEdit) {
        return <div style={{ color: '#f55', padding: 16 }}>Access denied.</div>
    }

    return (
        <div style={{ padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {/* Key list */}
            <div style={{ width: 260, flexShrink: 0 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12 }}>
                    Manage Contacts
                </div>

                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {(['duns', 'carrier'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setKeyFilter('') }}
                            style={{
                                flex:          1,
                                padding:       '4px 0',
                                borderRadius:  4,
                                border:        `1px solid ${mode === m ? '#4a9aff' : '#555'}`,
                                background:    mode === m ? '#1d3a5f' : 'transparent',
                                color:         mode === m ? '#fff' : '#aaa',
                                fontSize:      11,
                                fontWeight:    700,
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                cursor:        'pointer',
                            }}
                        >
                            {m === 'duns' ? 'DUNS' : 'Carrier'}
                        </button>
                    ))}
                </div>

                <input
                    placeholder={mode === 'duns' ? 'Filter DUNS or supplier…' : 'Filter SCAC…'}
                    value={keyFilter}
                    onChange={e => setKeyFilter(e.target.value)}
                    style={{ ...inputStyle, width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
                />
                {loadingKeys ? (
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>Loading…</div>
                ) : (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto', border: '1px solid #333', borderRadius: 4 }}>
                        {mode === 'duns' ? (
                            <>
                                {filteredDunsOptions.map(o => (
                                    <div
                                        key={o.duns}
                                        onClick={() => setSelectedDuns(o.duns)}
                                        style={{
                                            padding: '6px 10px',
                                            cursor: 'pointer',
                                            background: selectedDuns === o.duns ? '#2a3a5a' : '#1a1a1a',
                                            borderBottom: '1px solid #2a2a2a',
                                        }}
                                    >
                                        <div style={{ color: selectedDuns === o.duns ? '#fff' : '#e5e7eb', fontFamily: 'monospace', fontSize: '0.85rem' }}>{o.duns}</div>
                                        <div style={{ color: selectedDuns === o.duns ? '#93c5fd' : '#9ca3af', fontSize: '0.75rem' }}>{o.supplier}</div>
                                    </div>
                                ))}
                                {filteredDunsOptions.length === 0 && (
                                    <div style={{ padding: 10, color: '#888', fontSize: '0.85rem' }}>No matches</div>
                                )}
                            </>
                        ) : (
                            <>
                                {filteredCarrierOptions.map(scac => (
                                    <div
                                        key={scac}
                                        onClick={() => setSelectedCarrier(scac)}
                                        style={{
                                            padding: '6px 10px',
                                            cursor: 'pointer',
                                            background: selectedCarrier === scac ? '#2a3a5a' : '#1a1a1a',
                                            borderBottom: '1px solid #2a2a2a',
                                        }}
                                    >
                                        <div style={{ color: selectedCarrier === scac ? '#fff' : '#e5e7eb', fontFamily: 'monospace', fontSize: '0.85rem' }}>{scac}</div>
                                    </div>
                                ))}
                                {filteredCarrierOptions.length === 0 && (
                                    <div style={{ padding: 10, color: '#888', fontSize: '0.85rem' }}>No matches</div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Contacts panel */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {!selectedKey ? (
                    <div style={{ color: '#888', paddingTop: 40 }}>
                        Select a {mode === 'duns' ? 'DUNS' : 'carrier'} to manage its contacts.
                    </div>
                ) : (
                    <>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>
                            Contacts for {selectedKey}
                        </div>

                        {error && <div style={{ color: '#f55', marginBottom: 10 }}>{error}</div>}

                        {loadingContacts ? (
                            <div style={{ color: '#888' }}>Loading contacts…</div>
                        ) : (
                            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem', marginBottom: 16 }}>
                                <thead>
                                    <tr>
                                        {['Email', 'Name', 'Phone', ''].map(h => (
                                            <th key={h} style={th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.map((contact, index) => {
                                        const row   = getRow(contact)
                                        const dirty = isDirty(contact.email)
                                        return (
                                            <tr
                                                key={contact.email}
                                                style={{ background: dirty ? '#1a2a1a' : index % 2 === 0 ? '#1a1a1a' : '#222' }}
                                            >
                                                <td style={td}>
                                                    <span style={{ color: '#aaa' }}>{contact.email}</span>
                                                </td>
                                                <td style={td}>
                                                    <input
                                                        value={row.name}
                                                        onChange={e => handleChange(contact.email, 'name', e.target.value)}
                                                        style={inputStyle}
                                                    />
                                                </td>
                                                <td style={td}>
                                                    <input
                                                        value={row.phone}
                                                        onChange={e => handleChange(contact.email, 'phone', e.target.value)}
                                                        style={inputStyle}
                                                    />
                                                </td>
                                                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                                    <button
                                                        onClick={() => handleDelete(contact.email)}
                                                        style={{ ...btnStyle, color: '#f55', borderColor: '#f55' }}
                                                    >
                                                        Delete
                                                    </button>
                                                    {dirty && (
                                                        <>
                                                            <button
                                                                onClick={() => handleSave(contact.email)}
                                                                disabled={saving[contact.email]}
                                                                style={{ ...btnStyle, background: '#2a5a2a', borderColor: '#4a9a4a', marginLeft: 6, marginRight: 6 }}
                                                            >
                                                                {saving[contact.email] ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDiscard(contact.email)}
                                                                style={{ ...btnStyle, color: '#f55', borderColor: '#f55' }}
                                                            >
                                                                Discard
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {contacts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ ...td, color: '#888' }}>
                                                No contacts on file for this {mode === 'duns' ? 'DUNS' : 'carrier'}.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Add contact */}
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem', marginBottom: 8 }}>
                            Add Contact
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                placeholder="Email"
                                value={newContact.email}
                                onChange={e => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                                style={{ ...inputStyle, width: 220 }}
                            />
                            <input
                                placeholder="Name"
                                value={newContact.name}
                                onChange={e => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                                style={{ ...inputStyle, width: 180 }}
                            />
                            <input
                                placeholder="Phone"
                                value={newContact.phone}
                                onChange={e => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                                style={{ ...inputStyle, width: 150 }}
                            />
                            <button
                                onClick={handleAdd}
                                disabled={adding}
                                style={{ ...btnStyle, background: '#2a5a2a', borderColor: '#4a9a4a' }}
                            >
                                {adding ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

const th: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #333',
    background: '#111',
    color: '#fff',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 2,
}

const td: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #333',
    verticalAlign: 'middle',
}

const inputStyle: React.CSSProperties = {
    background: '#2a2a2a',
    border: '1px solid #555',
    borderRadius: 3,
    color: '#fff',
    padding: '3px 6px',
    fontSize: '0.8rem',
    width: '100%',
}

const btnStyle: React.CSSProperties = {
    padding: '3px 10px',
    borderRadius: 3,
    border: '1px solid #555',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.75rem',
}

export default ManageContacts
