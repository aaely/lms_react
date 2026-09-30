import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { ws as wsAtom } from '../signals/signals'
import { subscribeTopic } from './wsTopics'

/**
 * Opts this client into a ws topic for as long as the component is mounted.
 * useWS republishes the socket atom on every reconnect, so this re-subscribes
 * on its own after a drop.
 */
const useWsTopic = (topic: string) => {
    const [socket] = useAtom(wsAtom)

    useEffect(() => subscribeTopic(socket, topic), [socket, topic])
}

export default useWsTopic
