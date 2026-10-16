import { format, parse } from 'date-fns';
import { useEffect, useState } from 'react';
import { type LMSRecord } from '../signals/signals';
import { api } from '../utils/api';

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'success';
    case 'active':    return 'primary';
    case 'cancelled': return 'danger';
    case 'pending':   return 'warning';
    case 'approved':  return 'info';
    default:          return 'secondary';
  }
}

const formatArrival = (timeStr: string) => {
    if (!timeStr) return 'N/A'
    try {
        const clean = timeStr.trim().split(' ').slice(0, 2).join(' ')
        return format(parse(clean, 'yyyy-MM-dd HH:mm:ss.SSS', new Date()), 'MMM dd, HH:mm')
    } catch {
        return 'N/A'
    }
}

const ConflictingDeliveries = () => {
    const [results, setResults] = useState<LMSRecord[]>([])

    useEffect(() => {
        (async() => {
            try {
                const res = await api.get('/api/get_conflicting_deliveries')
                setResults(res.data)
            } catch (error) {
                console.log(error)
            }
        })()
    }, [])

    return (
        <div className="plant-view">
            <h2 className="date-header">Conflicting Deliveries</h2>
            <br />
            <div className="operational-day-section">
                <table className="table table-striped table-bordered">
                    <thead className="table-dark">
                        <tr>
                            <th>#</th>
                            <th>Load #</th>
                            <th>Dock</th>
                            <th>Trailer</th>
                            <th>SCAC</th>
                            <th>Route</th>
                            <th>Version</th>
                            <th>Sched Arrival</th>
                            <th>Ship Date</th>
                            <th>Location</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r, i) => (
                            <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{r.load_no || 'N/A'}</td>
                                <td>{r.dock || 'N/A'}</td>
                                <td>{r.trailer || 'N/A'}</td>
                                <td>{r.scac || 'N/A'}</td>
                                <td>{r.route_id}</td>
                                <td>{r.route_ver}</td>
                                <td>{formatArrival(r.schedule_arrival_time)}</td>
                                <td>{formatArrival(r.schedule_start_time)}</td>
                                <td>{r.dock_sequence || 'N/A'}</td>
                                <td>{r.location || 'N/A'}</td>
                                <td>
                                    <span className={`badge bg-${getStatusBadgeClass(r.status)}`}>
                                        {r.status || 'Unknown'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ConflictingDeliveries