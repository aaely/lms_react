import { format, parse, isBefore, addDays } from 'date-fns';
import { useAtom } from 'jotai/react';
import { dailyTotalsAtom, getShift, groupedDailyTrailersAtom, groupedTrailersAtom, shiftTotalsAtom, trls as t } from '../signals/signals';
import { getOperationalDate, getDock } from './Landing';

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
    const [{ groups, sortedDates }] = useAtom(groupedTrailersAtom);
    console.log(groups, sortedDates)
    const [shiftTotals] = useAtom(shiftTotalsAtom)
    const [dailyTotals] = useAtom(dailyTotalsAtom)
  return(
    <div className="plant-view">
        <a href="/" className="btn btn-secondary mb-3">
          <i className="bi bi-arrow-left"></i> Back to Landing
        </a>
      {sortedDates.map(opDate => {
        const shifts = groups[opDate];
        return (
          <div key={opDate} className="operational-day-section">
            <h2 className="date-header">
              {opDate}   <br />
              Total Trailers: {dailyTotals[opDate] || 0}
              <br />
              {Object.keys(shifts).map(shift => (
                <span key={shift} className="shift-badge">
                  |  {shift} Shift Totals: {shiftTotals[opDate]?.[shift] || 0}  |
                </span>
              ))}
            </h2>

            {Object.keys(shifts).map(shift => {
              const docks = shifts[shift];
              const sortedDocks = Object.keys(docks).sort();
              return (
                <div key={shift} className="shift-section">
                  <h3 className="shift-header">{shift} Shift</h3>
                  
                  {sortedDocks.map(dock => {
                    const dockTrailers = docks[dock];
                    
                    return (
                      <div key={dock} className="dock-subsection">
                        <h4>Dock {dock}  |  {opDate}  |  {shift} Shift  |  Total Trailers: {dockTrailers.length}</h4>
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
                              <tr key={trailer.loadNo}>
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
                            )})}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
      
      {sortedDates.length === 0 && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle"></i> No trailers found for this plant.
        </div>
      )}
    </div>

  );
};

export default PlantView;
