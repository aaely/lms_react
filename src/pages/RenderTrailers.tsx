import { format, parse } from 'date-fns';
import { getDock } from './Landing';
import { getStatusBadgeClass } from './Shifts';

interface SelectedDock {
    dock: string;
    shift: string;
    opDate: string;
    trailers: any[];
}

const RenderTrailers = ({dock, shift, opDate, trailers}: SelectedDock) => {


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
                    <th>Scheduled Arrival</th>
                    <th>Location</th>
                    <th>Status</th>
                </tr>
                </thead>
                <tbody>
                {trailers.map((trailer: any, index: number) => {
                    const displayTime = trailer.schedArrival 
                    ? format(
                        parse(trailer.schedArrival, 'MM/dd/yy hh:mm a', new Date()),
                        'MMM dd, HH:mm'
                        )
                    : 'N/A';
                    const countRoute = (trailer: any) => {
                    let count = 0
                    trailers.forEach((t: any) => {
                        if (t.routeId.slice(0,6) === trailer.routeId.slice(0,6) && t.routeId[t.routeId.length - 1].toLowerCase() !== 'r') {
                        count++
                        }
                    })
                    if (count > 1) {
                        return 'cyan'
                    }
                    return 'inherit'
                    }
                    return (
                    <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{trailer.loadNo || 'N/A'}</td>
                    <td>{getDock(trailer.acctorId, trailer.location)}</td>
                    <td>{trailer.trailer || 'N/A'}</td>
                    <td>{trailer.scac || 'N/A'}</td>
                    <td style={{ backgroundColor: countRoute(trailer) }}>{trailer.routeId}</td>
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
    )
}

export default RenderTrailers