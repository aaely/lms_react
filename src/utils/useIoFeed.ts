import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { ws as wsAtom } from '../signals/signals'
import { IO } from './wsTopics'
import useWsTopic from './useWsTopic'

/** One trailer as /api/get_io returns it; the pages only key on Trailer and Parts. */
export interface IoFeedTrailer {
    Trailer: string
    Parts?: string[]
    [field: string]: unknown
}

/** What the io topic pushes (mgo_backend src/io_feed.rs). */
export interface IoFeedHandlers {
    /** One trailer, after it was created or changed. */
    onUpdate:  (trailer: IoFeedTrailer) => void
    /** A trailer ID, after it was delivered or deleted. */
    onRemove:  (trailer: string) => void
    /** Many trailers changed at once (an upload); refetch /api/get_io. */
    onRefresh: () => void
}

/**
 * Keeps an IO page's trailer list current while it's mounted: subscribes to the
 * io topic and hands each change to the page. Listens alongside useWS (which
 * owns onmessage) rather than through it, since the list lives in the page.
 */
const useIoFeed = (handlers: IoFeedHandlers) => {
    const [socket] = useAtom(wsAtom)
    useWsTopic(IO)

    // Latest handlers without resubscribing on every render
    const ref = useRef(handlers)
    useEffect(() => { ref.current = handlers })

    useEffect(() => {
        if (!(socket instanceof WebSocket)) return
        const onMessage = ({ data }: MessageEvent) => {
            let message: { type?: string; data?: { message: string } }
            try { message = JSON.parse(data) } catch { return }
            try {
                switch (message.type) {
                    case 'io_update':
                        if (message.data) ref.current.onUpdate(JSON.parse(message.data.message) as IoFeedTrailer)
                        break
                    case 'io_removed':
                        if (message.data) ref.current.onRemove(message.data.message)
                        break
                    case 'io_refresh':
                        ref.current.onRefresh()
                        break
                }
            } catch (error) {
                console.error('Failed to apply IO update', error)
            }
        }
        socket.addEventListener('message', onMessage)
        return () => socket.removeEventListener('message', onMessage)
    }, [socket])
}

export default useIoFeed
