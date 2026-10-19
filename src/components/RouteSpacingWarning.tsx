import { Alert } from "@mui/material"
import { type NearbyDelivery } from "../utils/useRouteSpacing"
import { routeKey } from "../signals/routeBlackouts"

/** Lists the route's other deliveries too close to the new time; nothing when there are none. */
const RouteSpacingWarning = ({ route, nearby }: { route: string; nearby: NearbyDelivery[] }) => {
    if (nearby.length === 0) return null
    return (
        <Alert severity="warning" sx={{ textAlign: 'left' }}>
            Deliveries on a route need 2 hours between them. {routeKey(route)} also delivers:
            <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {nearby.map(n => (
                    <li key={`${n.source}-${n.loadNum}-${n.date}-${n.time}`}>
                        {n.loadNum || '(no load #)'} at {n.date} {n.time}
                        {' '}({n.minutesApart} min apart, {n.source})
                    </li>
                ))}
            </ul>
        </Alert>
    )
}

export default RouteSpacingWarning
