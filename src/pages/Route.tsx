import { format, parse } from 'date-fns';
import { useState } from 'react';
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

const RouteView = () => {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<LMSRecord[]>([]);

    const handleSearch = async (value: string) => {
        setSearch(value)
        if (!value.trim()) { setResults([]); return }
        try {
            const res = await api.get(`/api/get_lms_by_route?route=${encodeURIComponent(value)}`)
            setResults(res.data)
        } catch (err) {
            console.error('Route search failed', err)
        }
    }

    return (
        <div className="plant-view">
            <h2 className="date-header">Search By Route</h2>
            <br />
            <a href="/" className="btn btn-secondary mb-3">
                <i className="bi bi-arrow-left"></i> Back to Landing
            </a>
            <input
                type="text"
                className="form-control mb-3"
                placeholder="Search by Route ID..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
            />
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
                            <th>Sched Arrival</th>
                            <th>Actual Start</th>
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
                                <td>{formatArrival(r.schedule_arrival_time)}</td>
                                <td>{formatArrival(r.actual_start_time)}</td>
                                <td>{r.location || 'N/A'}</td>
                                <td>
                                    <span className={`badge bg-${getStatusBadgeClass(r.status)}`}>
                                        {r.status || 'Unknown'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {search.trim() && results.length === 0 && (
                            <tr>
                                <td colSpan={10} style={{ textAlign: 'center', color: '#aaa' }}>
                                    No records found for "{search}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default RouteView;
