// Server-side topics. The ws server relays a topic's feed only to the sockets
// that asked for it, so a page showing one opts in while it is mounted.
export const PART_ALERTS = 'part_alerts'

// The live board and the next-shift board share one client-side list, so each
// takes only its own add-ons.
export const LIVE_SHEET = 'live_sheet'
export const NEXT_SHIFT = 'next_shift'

/**
 * Subscribes this socket to `topic` and returns the unsubscribe. A page mounting
 * right after login usually finds the socket still CONNECTING, so the opt-in is
 * deferred to 'open' — addEventListener, since useWS owns onopen.
 */
export const subscribeTopic = (socket: unknown, topic: string): (() => void) => {
    if (!(socket instanceof WebSocket)) return () => {}

    const send = (type: 'subscribe' | 'unsubscribe') => {
        if (socket.readyState !== WebSocket.OPEN) return
        socket.send(JSON.stringify({ type, data: { message: topic } }))
    }

    const onOpen = () => send('subscribe')

    if (socket.readyState === WebSocket.OPEN) send('subscribe')
    else socket.addEventListener('open', onOpen)

    return () => {
        socket.removeEventListener('open', onOpen)
        // A closed socket is already dropped server-side, so this is a no-op then.
        send('unsubscribe')
    }
}
