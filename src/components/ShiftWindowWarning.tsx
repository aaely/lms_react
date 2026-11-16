import { Alert } from "@mui/material"
import { type ShiftWindow } from "../utils/dateShift"

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`

/**
 * Says the chosen start time falls outside the shift the row is filed under;
 * nothing when `window` is null (the time is inside it).
 */
const ShiftWindowWarning = ({ dateShift, date, time, window }: {
    dateShift: string; date: string; time: string; window: ShiftWindow | null
}) => {
    if (!window) return null
    return (
        <Alert severity="warning" sx={{ textAlign: 'left' }}>
            {date} {time} is outside {dateShift}, which runs {fmt(window.start)} – {fmt(window.end)}.
            The trailer will still be filed under {dateShift}; check the date and time,
            or add it to the board for the shift it belongs to.
        </Alert>
    )
}

export default ShiftWindowWarning
