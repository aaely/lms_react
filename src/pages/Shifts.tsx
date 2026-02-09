import { format, parse } from 'date-fns';
import { useAtom } from 'jotai/react';
import { dailyTotalsAtom, groupedTrailersAtom, shiftTotalsAtom } from '../signals/signals';
import { getDock } from './Landing';

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

const formatDateWithoutTZ = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const formatWithTimeZone = (dateStr: string, timeZone = 'America/Chicago') => {
  if (!dateStr) return 'N/A';
  
  const date = new Date(dateStr);
  
  // Use Intl.DateTimeFormat for timezone conversion
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone // ✅ Valid in Intl.DateTimeFormat
  });
  
  const parts = formatter.formatToParts(date);
  
  // Extract and format: "Jan 15, 14:30"
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  
  return `${month} ${day}, ${hour}:${minute}`;
};

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
        const sortedShifts = Object.keys(shifts).sort((a, b) => {
          const shiftOrder = ['3rd', '1st', '2nd'];
          const indexA = shiftOrder.indexOf(a);
          const indexB = shiftOrder.indexOf(b);
          return indexA - indexB;
        })
        return (
          <div key={opDate} className="operational-day-section">
            <h2 className="date-header">
              {formatDateWithoutTZ(opDate)}   <br />
              Total Trailers: {dailyTotals[opDate] || 0}
              <br />
              {Object.keys(shifts).map(shift => (
                <span key={shift} className="shift-badge">
                  |  {shift} Shift Totals: {shiftTotals[opDate]?.[shift] || 0}  |
                </span>
              ))}
            </h2>

            {sortedShifts.map(shift => {
              const docks = shifts[shift];
              const sortedDocks = Object.keys(docks).sort();
              return (
                <div key={shift} className="shift-section">
                  <h3 className="shift-header">{shift} Shift</h3>
                  
                  {sortedDocks.map(dock => {
                    const dockTrailers = docks[dock].sort((a, b) => {
                      const timeA = a.schedArrival ? new Date(a.schedArrival).getTime() : 0;
                      const timeB = b.schedArrival ? new Date(b.schedArrival).getTime() : 0;
                      return timeA - timeB; 
                    });
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
