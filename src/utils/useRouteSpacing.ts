import { useEffect, useState } from "react"
import { api } from "./api"

/** /api/route_deliveries_near: another delivery on the route near the new time. */
export interface NearbyDelivery {
    source:       string
    loadNum:      string
    date:         string
    time:         string
    minutesApart: number
}

/**
 * Other deliveries on `route` less than 2 hours either side of `date` `time`,
 * looked up 400 ms after the fields stop changing. `load` and `repower` are
 * the loads being scheduled, left out of the check. `dock` is where it's
 * delivering: E is scheduled by hand through the logs, so its check leaves
 * the LMS loads out. A warning only: neither log refuses a delivery on it.
 */
const useRouteSpacing = (route: string, date: string, time: string, dock: string, load?: string, repower?: string) => {
    const [nearby, setNearby] = useState<NearbyDelivery[]>([])

    useEffect(() => {
        if (!route || !date || !time) {
            setNearby([])
            return
        }
        let stale = false
        const timeout = setTimeout(async () => {
            try {
                const res = await api.get<NearbyDelivery[]>('/api/route_deliveries_near', {
                    params: { route, date, time, dock: dock || undefined, load: load || undefined, repower: repower || undefined },
                })
                if (!stale) setNearby(res.data)
            } catch (error) {
                console.log(error)
            }
        }, 400)
        return () => { stale = true; clearTimeout(timeout) }
    }, [route, date, time, dock, load, repower])

    return nearby
}

export default useRouteSpacing
