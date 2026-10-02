import { useEffect } from 'react'
import { useAtom } from 'jotai'
import { user } from '../signals/signals'
import { BUILT_IN_DOCK_CAPACITY, dockCapacity, fromRows, type DockCapacityRows } from '../signals/dockCapacity'
import { api } from './api'

/**
 * Loads the configured dock capacity into the dockCapacity atom once signed in.
 * Mounted in App next to useWS. Nothing saved yet, or the request failing, leaves
 * the built-in values in place.
 */
const useLoadDockCapacity = () => {
    const [u] = useAtom(user)
    const [, setCapacity] = useAtom(dockCapacity)

    useEffect(() => {
        if (!u.email) return
        api.get<DockCapacityRows>('/api/get_dock_capacity')
            .then(res => setCapacity(fromRows(res.data) ?? BUILT_IN_DOCK_CAPACITY))
            .catch(error => console.error('Failed to load dock capacity; using built-in values', error))
    }, [u.email, setCapacity])
}

export default useLoadDockCapacity
