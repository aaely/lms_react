import { useState } from 'react'
import { logout } from '../utils/api'

const linkStyle: React.CSSProperties = {
    color: 'limegreen',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: '0.03em',
}

const dropdownItemStyle: React.CSSProperties = {
    display: 'block',
    padding: '9px 16px',
    color: 'limegreen',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
}

function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            <span style={{ ...linkStyle, cursor: 'pointer', userSelect: 'none' }}>
                {label} ▾
            </span>
            {open && (
                <div style={{
                    position:        'absolute',
                    top:             '100%',
                    left:            '50%',
                    transform:       'translateX(-50%)',
                    marginTop:       6,
                    background:      '#222',
                    border:          '1px solid #444',
                    borderRadius:    6,
                    boxShadow:       '0 4px 12px rgba(0,0,0,0.4)',
                    zIndex:          2000,
                    minWidth:        160,
                    paddingBlock:    4,
                }}>
                    {children}
                </div>
            )}
        </div>
    )
}

export default function Nav() {
    return (
        <div style={{
            display:         'flex',
            position:        'fixed',
            top:             0,
            left:            0,
            zIndex:          1000,
            alignItems:      'center',
            gap:             24,
            paddingInline:   24,
            width:           '100vw',
            height:          '7vh',
            backgroundColor: '#333',
            color:           'limegreen',
            boxSizing:       'border-box',
        }}>
            <a href="/"            style={linkStyle}>Home</a>
            <a href="/live"        style={linkStyle}>Schedule</a>
            <a href="/route"       style={linkStyle}>Search By Route</a>
            <a href="/scan"        style={linkStyle}>Scan</a>
            <a href="/hot"         style={linkStyle}>Hot Parts</a>
            <a href="/partAlerts"  style={linkStyle}>Part Alerts</a>
            <a href="/calendar"    style={linkStyle}>Floater Calendar</a>
            <a href="/manageContacts"    style={linkStyle}>Manage Contacts</a>

            <Dropdown label="Scheduling">
                <a href="/rail"         style={dropdownItemStyle}>Rail Drill</a>
                <a href="/io"           style={dropdownItemStyle}>IO Scheduling</a>
                <a href="/shiftBuilder" style={dropdownItemStyle}>Shift Builder</a>
                <a href="/exception" style={dropdownItemStyle}>Exception Log</a>
                <a href="/dy" style={dropdownItemStyle}>DY Log</a>
            </Dropdown>

            <a href="/refreshData" style={linkStyle}>Refresh MGO</a>
            <a href="/audit"       style={linkStyle}>Event Log</a>
            <div onClick={logout} style={{ ...linkStyle, cursor: 'pointer', marginLeft: 'auto' }}>
                Logout
            </div>
        </div>
    )
}
