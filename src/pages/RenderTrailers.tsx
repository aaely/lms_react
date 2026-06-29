import { format, parse } from 'date-fns';
import { getStatusBadgeClass } from './Shifts';
import { lowestDoh, routeDuns, type LMSRecord } from '../signals/signals'
import { useAtom } from 'jotai';
import useInitParts from '../utils/useInitParts';

interface SelectedDock {
    dock: string;
    shift: string;
    opDate: string;
    trailers: LMSRecord[];
}

const RenderTrailers = ({ dock, shift, opDate, trailers }: SelectedDock) => {

    const [ldoh] = useAtom(lowestDoh)
    const [rduns] = useAtom(routeDuns)
    const lowestDohAsMap = new Map(Object.entries(ldoh))
    useInitParts()

    const getLdoh = (route: string) => {
        if (!route) return null
        const r = route.slice(0, 6)
        const parts = rduns.get(r) || []
        if (parts.length === 0) return null
        const dohValues = parts
            .map((part: any) => lowestDohAsMap.get(part))
            .filter((doh: any) => doh !== undefined && doh !== null && !isNaN(doh))
        return dohValues.length > 0 ? Math.min(...dohValues) : null
    }

    const countRoute = (trailer: LMSRecord) => {
        if (!trailer.route_id) return 'inherit'
        const prefix = trailer.route_id.slice(0, 6)
        const count = trailers.filter(t =>
            t.route_id && t.route_id.slice(0, 6) === prefix &&
            t.route_id[t.route_id.length - 1].toLowerCase() !== 'r'
        ).length
        return count > 1 ? 'cyan' : 'inherit'
    }

    const formatArrival = (timeStr: string) => {
        if (!timeStr) return 'N/A'
        try {
            // strip timezone offset if present ("2026-06-25 12:30:00.000 -05:00" → "2026-06-25 12:30:00.000")
            const clean = timeStr.trim().split(' ').slice(0, 2).join(' ')
            return format(parse(clean, 'yyyy-MM-dd HH:mm:ss.SSS', new Date()), 'MMM dd, HH:mm')
        } catch {
            return 'N/A'
        }
    }

    return (
        <div key={dock} className="dock-subsection">
            <h4>Dock {dock}  |  {opDate}  |  {shift} Shift  |  Total Trailers: {trailers.length}</h4>
            <table className="table table-striped table-bordered">
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Load #</th>
                        <th>Dock</th>
                        <th>Trailer</th>
                        <th>SCAC</th>
                        <th>Route</th>
                        <th>Lowest Doh</th>
                        <th>Scheduled Arrival</th>
                        <th>Location</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                {trailers.map((trailer, index) => (
                    <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{trailer.load_no || 'N/A'}</td>
                        <td>{trailer.dock || 'N/A'}</td>
                        <td>{trailer.trailer || 'N/A'}</td>
                        <td>{trailer.scac || 'N/A'}</td>
                        <td style={{ backgroundColor: countRoute(trailer) }}>{trailer.route_id}</td>
                        <td style={{ backgroundColor: countRoute(trailer) }}>{getLdoh(trailer.route_id)}</td>
                        <td>{formatArrival(trailer.schedule_arrival_time)}</td>
                        <td>{trailer.location || 'N/A'}</td>
                        <td>
                            <span className={`badge bg-${getStatusBadgeClass(trailer.status)}`}>
                                {trailer.status || 'Unknown'}
                            </span>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
}

export default RenderTrailers
