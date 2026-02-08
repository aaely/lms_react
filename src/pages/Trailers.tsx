import { format, parse } from 'date-fns';
import { useAtom } from 'jotai/react';
import { groupedDailyTrailersAtom } from '../signals/signals';
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

const PlantView = () => {
    const [{ groups, sortedDates }] = useAtom(groupedDailyTrailersAtom);
  
  return(
    <div className="plant-view">
      {sortedDates.map((opDate: any) => {
        const dateGroups = groups[opDate];
        const sortedDocks = Object.keys(dateGroups).sort();
        return (
          <div key={opDate} className="operational-day-section">
            <h2 className="date-header">
              {opDate}   |  Total Trailers: {
                Object.values(dateGroups).reduce(
                  (sum, dockArray) => sum + dockArray.length, 0
                )
              }
            </h2>
            {sortedDocks.map((dock: any) => {
                const dockTrailers = dateGroups[dock]
                return (
                    <div key={dock} className="dock-section">
                        <h3 className="dock-header">
                        Dock: {dock}  |  {dockTrailers.length}
                        </h3>
        
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
                            {dockTrailers.map((trailer: any, index: number) => {
                                const displayTime = trailer.schedArrival 
                                    ? format(
                                        parse(trailer.schedArrival, 'MM/dd/yy hh:mm a', new Date()),
                                        'MMM dd, HH:mm'
                                    )
                                    : 'N/A';
                            
                            return (
                                        <tr key={trailer.loadNo || index}>
                                            <td>{index + 1}</td>
                                            <td>{trailer.loadNo || 'N/A'}</td>
                                            <td>{getDock(trailer.acctorId, trailer.location)}</td>
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
                )
            }
        )}
            </div>
        )}
      )}
      
      {sortedDates.length === 0 && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No trailers found for this plant.
        </div>
      )}
    </div>

  );
};

export default PlantView;
