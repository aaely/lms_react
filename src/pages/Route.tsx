import { format, parse } from 'date-fns';
import { useAtom } from 'jotai/react';
import { searchRoute, filterByRoute } from '../signals/signals';
import {  getDock } from './Landing';

const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'active':
      return 'primary';
    case 'cancelled':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'approved':
        return 'info'
    default:
      return 'secondary';
  }
}

const RouteView = () => {
    const [search, setSearch] = useAtom(searchRoute);
    const [filteredTrailers] = useAtom(filterByRoute);

    const handleChange = ({target: {value}}: any) => {
        setSearch(value);
    }      

    
    return(
        <div className="plant-view">
            <h2 className="date-header">
                    Search By Route
            </h2>
            <br />
            <a href="/" className="btn btn-secondary mb-3">
                <i className="bi bi-arrow-left"></i> Back to Landing
            </a>
            <input type="text" className="form-control mb-3" placeholder="Search by Route ID..." value={search} onChange={handleChange} />
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
                            <th>Scheduled Arrival</th>
                            <th>Location</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                <tbody>
                    {filteredTrailers?.map((trailer: any, index: number) => {
                        const displayTime = trailer.schedArrival 
                            ? format(
                                parse(trailer.schedArrival, 'MM/dd/yy hh:mm a', new Date()),
                                'MMM dd, HH:mm'
                            )
                            : 'N/A';
                    
                    return (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>{trailer.loadNo || 'N/A'}</td>
                                    <td>{getDock(trailer.acctorId, trailer.location, trailer.routeId)}</td>
                                    <td>{trailer.trailer || 'N/A'}</td>
                                    <td>{trailer.scac || 'N/A'}</td>
                                    <td>{trailer.routeId}</td>
                                    <td>{displayTime}</td>
                                    <td>{trailer.location || 'N/A'}</td>
                                    <td>
                                        <span className={`badge bg-${getStatusBadgeClass(trailer.status)}`}>
                                        {trailer.status || 'Unknown'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </div>
            </div>
)}

export default RouteView;
