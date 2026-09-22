import type { TrailerRecord, ScheduleRange } from '../signals/signals'

export const SCHEDULE_BROADCAST = 'schedule_broadcast'

// The ws server relays every message to all clients, sender included, so each
// tab tags its own broadcasts and ignores the echo.
export const CLIENT_ID =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`

export interface SchedulePayload {
    senderId:    string
    sentBy:      string
    sentAt:      string
    tab:         number
    range:       ScheduleRange | null
    allTrls:     TrailerRecord[]
    rescheduled: TrailerRecord[]
}

export const sendScheduleBroadcast = (socket: unknown, payload: SchedulePayload) => {
    if (!(socket instanceof WebSocket) || socket.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected')
    }
    // MessageData.message is a String server-side, so the state rides as JSON text
    // the same way trailer_update does.
    socket.send(JSON.stringify({
        type: SCHEDULE_BROADCAST,
        data: { message: JSON.stringify(payload) },
    }))
}

/** Returns the payload for a schedule broadcast from another client, else null. */
export const parseScheduleBroadcast = (raw: string): SchedulePayload | null => {
    try {
        const message = JSON.parse(raw)
        if (message?.type !== SCHEDULE_BROADCAST) return null
        const payload: SchedulePayload = JSON.parse(message.data.message)
        if (payload.senderId === CLIENT_ID) return null
        return payload
    } catch (error) {
        console.error('Failed to parse schedule broadcast', error)
        return null
    }
}
