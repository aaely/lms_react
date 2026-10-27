import { useState } from 'react'

/*
 * Fills in a time the floor or security never stamped. The Live Sheet shows it
 * under a blank stamp button only when the trailer's stat says the event
 * happened. The time is saved in the same shape the stamp buttons write
 * (toLocaleTimeString, en-CA date), so everything reading it treats it alike.
 */

interface Props {
    /** What's being filled, for the hover text: "gate arrival", "dock start"… */
    label:  string
    /** The en-CA date, the time as the stamp buttons write it, and the moment itself */
    onSave: (date: string, time: string, at: Date) => Promise<unknown>
}

const OverrideTime = ({ label, onSave }: Props) => {
    const [open, setOpen]     = useState(false)
    const [date, setDate]     = useState('')
    const [time, setTime]     = useState('')
    const [saving, setSaving] = useState(false)

    const picked = date && time ? new Date(`${date}T${time}`) : null
    const future = !!picked && picked.getTime() > Date.now()

    const start = () => {
        setDate(new Date().toLocaleDateString('en-CA'))
        setTime('')
        setOpen(true)
    }

    const save = async () => {
        if (!picked || future || saving) return
        setSaving(true)
        try {
            await onSave(date, picked.toLocaleTimeString(), picked)
            setOpen(false)
        } catch {
            // saveTrailer has already alerted why; keep the inputs to retry
        } finally {
            setSaving(false)
        }
    }

    if (!open) {
        return (
            <div>
                <a onClick={start} title={`Enter the ${label} time by hand`}
                    style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                    Override
                </a>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            <input type="time" value={time} autoFocus
                onChange={e => setTime(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') save()
                    if (e.key === 'Escape') setOpen(false)
                }} />
            {future && <span style={{ color: 'red', fontSize: 12 }}>Can't be in the future</span>}
            <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-primary" disabled={!picked || future || saving} onClick={save}>Save</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            </div>
        </div>
    )
}

export default OverrideTime
