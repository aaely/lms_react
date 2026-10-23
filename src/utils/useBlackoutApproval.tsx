import { useState } from "react"
import { useAtom } from "jotai"
import { Alert, Button, Stack, TextField } from "@mui/material"
import { blackedOutHour, routeBlackouts, routeKey } from "../signals/routeBlackouts"

/**
 * Step two of scheduling into a blacked-out hour: the user enters who approved it
 * and why, confirms approval was gained, and the entry is then sent with
 * `blackoutApproved` so the server lets it through. The acknowledgement is for
 * one route and hour only — changing either drops it, so it can't carry over to
 * a time nobody approved. The initials and reason stay filled in for a re-check.
 */
const useBlackoutApproval = (route: string | undefined, time: string | undefined) => {
    const [blackouts] = useAtom(routeBlackouts)
    const hour = blackedOutHour(blackouts, route, time)
    const key = hour === null ? null : `${routeKey(route)}|${hour}`
    const [acknowledged, setAcknowledged] = useState<string | null>(null)
    const [approver, setApprover] = useState('')
    const [reason, setReason] = useState('')

    const approved = key !== null && acknowledged === key
    return {
        /** The blacked-out hour this delivery lands in, or null when it's allowed. */
        hour,
        approved,
        /** Nothing stops the entry: the hour is open, or its blackout was approved. */
        clear: hour === null || approved,
        approver,
        reason,
        setApprover,
        setReason,
        /** Both are required before approval can be acknowledged. */
        canApprove: approver.trim() !== '' && reason.trim() !== '',
        approve: () => setAcknowledged(key),
        undo:    () => setAcknowledged(null),
        /** Clears everything, for after the entry is saved. */
        reset: () => { setAcknowledged(null); setApprover(''); setReason('') },
        /** What the entry sends; blank unless approved, so stale text isn't saved. */
        details: {
            blackoutApproved: approved,
            blackoutApprover: approved ? approver.trim().toUpperCase() : '',
            blackoutReason:   approved ? reason.trim() : '',
        },
    }
}

/**
 * The approver's initials, the reason, and the button that acknowledges
 * approval — or the note that it was. Nothing when the hour is open.
 */
export const BlackoutApproval = ({ approval }: { approval: ReturnType<typeof useBlackoutApproval> }) => {
    if (approval.hour === null) return null
    const hour = `${String(approval.hour).padStart(2, '0')}:00`
    return approval.approved ? (
        <Alert
            severity="success"
            sx={{ textAlign: 'left' }}
            action={<Button color="inherit" size="small" onClick={approval.undo}>Undo</Button>}
        >
            Approved by {approval.details.blackoutApprover} to deliver in the blacked-out {hour} hour: {approval.details.blackoutReason}
        </Alert>
    ) : (
        <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                    label="Approver Initials"
                    value={approval.approver}
                    onChange={e => approval.setApprover(e.target.value)}
                    inputProps={{ maxLength: 5, style: { textTransform: 'uppercase' } }}
                    sx={{ width: { sm: 180 } }}
                />
                <TextField
                    label="Reason for the blacked-out hour"
                    value={approval.reason}
                    onChange={e => approval.setReason(e.target.value)}
                    fullWidth
                />
            </Stack>
            <Button
                variant="outlined"
                color="warning"
                onClick={approval.approve}
                disabled={!approval.canApprove}
                title={approval.canApprove ? undefined : 'Enter the approver\'s initials and a reason first'}
            >
                Approval obtained — schedule in this blacked-out hour
            </Button>
        </Stack>
    )
}

export default useBlackoutApproval
