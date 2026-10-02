import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'
import { fromList, routeBlackouts, type RouteBlackout } from '../signals/routeBlackouts'
import { api } from './api'

/**
 * Loads route blackouts into the routeBlackouts atom once signed in. Mounted in
 * App next to useWS, which keeps it current when an admin saves. If the request
 * fails nothing is blacked out on screen, but the upload routes still refuse a
 * blacked-out delivery.
 */
const useLoadRouteBlackouts = () => {
    const [u] = useAtom(user)
    const [, setBlackouts] = useAtom(routeBlackouts)

    useEffect(() => {
        if (!u.email) return
        api.get<RouteBlackout[]>('/api/get_route_blackouts')
            .then(res => setBlackouts(fromList(res.data)))
            .catch(error => console.error('Failed to load route blackouts', error))
    }, [u.email, setBlackouts])
}

export default useLoadRouteBlackouts
