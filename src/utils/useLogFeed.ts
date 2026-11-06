import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { ws as wsAtom } from '../signals/signals'
import { IO } from './wsTopics'
import useWsTopic from './useWsTopic'

/**
 * Which log: the Exception Log (`exception_*` messages) or the DY Communication
 * Log (`dycomm_*`). Both ride the io topic (mgo_backend src/io_feed.rs).
 */
export type LogFeedKind = 'exception' | 'dycomm'

export interface LogFeedHandlers<Entry, Key> {
    /** One entry as the log's get route returns it, after it was saved. */
    onUpdate:  (entry: Entry) => void
    /** The entry's key ({loadNum, dock, trailer1} / {loadNum, dock, trailer}), after it was deleted or archived. */
    onRemove:  (key: Key) => void
    /** Entries changed in bulk or without a known key; refetch the log. */
    onRefresh: () => void
}

/**
 * Keeps a log page's entries current while it's mounted: subscribes to the io
 * topic and hands this log's changes to the page. Listens alongside useWS
 * (which owns onmessage), like useIoFeed.
 */
const useLogFeed = <Entry, Key>(kind: LogFeedKind, handlers: LogFeedHandlers<Entry, Key>) => {
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
                    case `${kind}_update`:
                        if (message.data) ref.current.onUpdate(JSON.parse(message.data.message) as Entry)
                        break
                    case `${kind}_removed`:
                        if (message.data) ref.current.onRemove(JSON.parse(message.data.message) as Key)
                        break
                    case `${kind}_refresh`:
                        ref.current.onRefresh()
                        break
                }
            } catch (error) {
                console.error(`Failed to apply ${kind} log update`, error)
            }
        }
        socket.addEventListener('message', onMessage)
        return () => socket.removeEventListener('message', onMessage)
    }, [socket, kind])
}

export default useLogFeed
