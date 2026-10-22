import { useState } from "react"
import { useAtom } from "jotai"
import { Alert, Button } from "@mui/material"
import { blackedOutHour, routeBlackouts, routeKey } from "../signals/routeBlackouts"

/**
 * Step two of scheduling into a blacked-out hour: the user confirms approval was
 * gained, and the entry is then sent with `blackoutApproved` so the server lets
 * it through. The acknowledgement is for one route and hour only — changing
 * either drops it, so it can't carry over to a time nobody approved.
 */
const useBlackoutApproval = (route: string | undefined, time: string | undefined) => {
    const [blackouts] = useAtom(routeBlackouts)
    const hour = blackedOutHour(blackouts, route, time)
    const key = hour === null ? null : `${routeKey(route)}|${hour}`
    const [acknowledged, setAcknowledged] = useState<string | null>(null)

    const approved = key !== null && acknowledged === key
    return {
        /** The blacked-out hour this delivery lands in, or null when it's allowed. */
        hour,
        approved,
        /** Nothing stops the entry: the hour is open, or its blackout was approved. */
        clear: hour === null || approved,
        approve: () => setAcknowledged(key),
        undo:    () => setAcknowledged(null),
    }
}

/** The button that acknowledges approval, or the note that it was; nothing when the hour is open. */
export const BlackoutApproval = ({ approval }: { approval: ReturnType<typeof useBlackoutApproval> }) => {
    if (approval.hour === null) return null
    return approval.approved ? (
        <Alert
            severity="success"
            sx={{ textAlign: 'left' }}
            action={<Button color="inherit" size="small" onClick={approval.undo}>Undo</Button>}
        >
            Approval to deliver in the blacked-out {String(approval.hour).padStart(2, '0')}:00 hour acknowledged.
        </Alert>
    ) : (
        <Button variant="outlined" color="warning" onClick={approval.approve}>
            Approval obtained — schedule in this blacked-out hour
        </Button>
    )
}

export default useBlackoutApproval
