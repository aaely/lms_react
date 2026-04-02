import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'

interface UserRecord {
    name:      string
    full_name: string
    position:  string
    role:      string
    shift:     string
    slack_id:  string
}

const POSITIONS = ['MFU', 'Floater', 'Manager', 'RECEIVING', 'TRAFFIC', 'COUNTS', 'ADMIN', 'BC TEAM']
const ROLES     = ['admin', 'manager', 'floater', 'mfu']
const SHIFTS    = ['1st', '2nd', '3rd']

const EditUser = () => {
    const [users, setUsers]       = useState<UserRecord[]>([])
    const [edited, setEdited]     = useState<Record<string, UserRecord>>({})
    const [saving, setSaving]     = useState<Record<string, boolean>>({})
    const [u]                     = useAtom(user)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await api.get('/api/get_users_admin')
            setUsers(res.data)
        } catch (error) {
            console.error('Failed to fetch users:', error)
        }
    }

    const getRow = (user: UserRecord): UserRecord =>
        edited[user.name] ?? user

    const handleChange = (name: string, field: keyof UserRecord, value: string) => {
        setEdited(prev => ({
            ...prev,
            [name]: {
                ...(prev[name] ?? users.find(u => u.name === name)!),
                [field]: value
            }
        }))
    }

    const handleSave = async (name: string) => {
        const row = edited[name]
        if (!row) return
        setSaving(prev => ({ ...prev, [name]: true }))
        try {
            await api.post('/api/update_user', row)
            setUsers(prev => prev.map(u => u.name === name ? row : u))
            setEdited(prev => {
                const next = { ...prev }
                delete next[name]
                return next
            })
        } catch (error) {
            console.error('Failed to save user:', error)
        } finally {
            setSaving(prev => ({ ...prev, [name]: false }))
        }
    }

    const handleDiscard = (name: string) => {
        setEdited(prev => {
            const next = { ...prev }
            delete next[name]
            return next
        })
    }

    const isDirty = (name: string) => !!edited[name]

    const positionColor = (position: string) => {
        switch (position?.toLowerCase()) {
            case 'manager':  return '#d4a017'
            case 'floater':  return '#1f77b4'
            case 'mfu':      return '#2ca02c'
            default:         return '#888'
        }
    }

    if (u.role !== 'admin' && u.role !== 'manager') {
        return <div style={{ color: '#f55', padding: 16 }}>Access denied.</div>
    }

    return (
        <div style={{ padding: 16, overflowX: 'auto' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 12 }}>
                User Management
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
                <thead>
                    <tr>
                        {['Email', 'Full Name', 'Position', 'Role', 'Shift', 'Slack ID', ''].map(h => (
                            <th key={h} style={th}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => {
                        const row   = getRow(user)
                        const dirty = isDirty(user.name)
                        return (
                            <tr
                                key={user.name}
                                style={{ background: dirty ? '#1a2a1a' : index % 2 === 0 ? '#1a1a1a' : '#222' }}
                            >
                                {/* Email — not editable */}
                                <td style={td}>
                                    <span style={{ color: '#aaa' }}>{user.name}</span>
                                </td>

                                {/* Full Name */}
                                <td style={td}>
                                    <input
                                        value={row.full_name}
                                        onChange={e => handleChange(user.name, 'full_name', e.target.value)}
                                        style={inputStyle}
                                    />
                                </td>

                                {/* Position */}
                                <td style={td}>
                                    <select
                                        value={row.position}
                                        onChange={e => handleChange(user.name, 'position', e.target.value)}
                                        style={{
                                            ...inputStyle,
                                            color: positionColor(row.position),
                                            fontWeight: 600
                                        }}
                                    >
                                        {POSITIONS.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* Role */}
                                <td style={td}>
                                    <select
                                        value={row.role}
                                        onChange={e => handleChange(user.name, 'role', e.target.value)}
                                        style={inputStyle}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* Shift */}
                                <td style={td}>
                                    <select
                                        value={row.shift}
                                        onChange={e => handleChange(user.name, 'shift', e.target.value)}
                                        style={inputStyle}
                                    >
                                        {SHIFTS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </td>

                                {/* Slack ID */}
                                <td style={td}>
                                    <input
                                        value={row.slack_id}
                                        placeholder="U0XXXXXXX"
                                        onChange={e => handleChange(user.name, 'slack_id', e.target.value)}
                                        style={inputStyle}
                                    />
                                </td>

                                {/* Actions */}
                                <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`Delete ${user.name}?`)) return
                                            try {
                                                await api.delete('/api/delete_user', { data: { name: user.name } })
                                                setUsers(prev => prev.filter(u => u.name !== user.name))
                                            } catch (error) {
                                                console.error('Failed to delete user:', error)
                                            }
                                        }}
                                        style={{ ...btnStyle, color: '#f55', borderColor: '#f55' }}
                                    >
                                        Delete
                                    </button>
                                    {dirty && (
                                        <>
                                            <button
                                                onClick={() => handleSave(user.name)}
                                                disabled={saving[user.name]}
                                                style={{
                                                    ...btnStyle,
                                                    background: '#2a5a2a',
                                                    borderColor: '#4a9a4a',
                                                    marginRight: 6
                                                }}
                                            >
                                                {saving[user.name] ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => handleDiscard(user.name)}
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
                </tbody>
            </table>
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

export default EditUser