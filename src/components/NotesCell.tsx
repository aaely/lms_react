import { useEffect, useRef, useState } from 'react'

interface Props {
    value:        string
    onSave:       (text: string) => Promise<void>
    placeholder?: string
    /** Shown but not editable, with `readOnlyTitle` as the reason on hover. */
    readOnly?:    boolean
    readOnlyTitle?: string
    /** Fills the box, for a note that needs attention. Transparent otherwise. */
    background?:  string
}

/**
 * A table note editable in place (IO Delay / Issue Notes, the Live Sheet's
 * comments). Holds its own draft so typing doesn't re-render the whole table.
 * Enter or clicking away saves (Shift+Enter for a new line), Esc undoes; a
 * failed save keeps the text with a red border.
 */
const NotesCell = ({ value, onSave, placeholder = 'Add a note', readOnly = false, readOnlyTitle, background = 'transparent' }: Props) => {
    const [draft, setDraft] = useState(value)
    const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const editing = useRef(false)
    const reverting = useRef(false)

    // Take a newly saved value unless it's being edited right now
    useEffect(() => { if (!editing.current) setDraft(value) }, [value])

    const commit = async () => {
        editing.current = false
        if (reverting.current) { reverting.current = false; return }
        if (readOnly || draft === value) return
        setState('saving')
        try {
            await onSave(draft)
            setState('saved')
            setTimeout(() => setState(s => s === 'saved' ? 'idle' : s), 1500)
        } catch {
            setState('error')
        }
    }

    const border = state === 'error' ? '#dc3545' : state === 'saved' ? '#198754' : state === 'saving' ? '#999' : '#ccc'

    return (
        <textarea
            value={draft}
            rows={2}
            placeholder={readOnly ? '' : placeholder}
            readOnly={readOnly}
            disabled={state === 'saving'}
            title={readOnly ? readOnlyTitle
                : state === 'error' ? 'Not saved: click in and press Enter to try again'
                : 'Enter or click away to save, Shift+Enter for a new line, Esc to undo'}
            onFocus={() => { editing.current = true }}
            onChange={ev => { setDraft(ev.target.value); if (state === 'error') setState('idle') }}
            onBlur={commit}
            onKeyDown={ev => {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                    ev.preventDefault()
                    ev.currentTarget.blur()
                } else if (ev.key === 'Escape') {
                    // The blur below would otherwise save the text being abandoned
                    reverting.current = true
                    setDraft(value)
                    setState('idle')
                    ev.currentTarget.blur()
                }
            }}
            style={{
                minWidth: 220,
                width: '100%',
                fontSize: 13,
                padding: '4px 6px',
                borderRadius: 4,
                color: 'black',
                border: `1px solid ${border}`,
                resize: 'vertical',
                background,
                cursor: readOnly ? 'not-allowed' : undefined,
            }}
        />
    )
}

export default NotesCell
