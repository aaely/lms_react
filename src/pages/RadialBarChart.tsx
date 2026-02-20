import { useAtom } from 'jotai/react';
import { useState } from 'react';
import { dailyTotalsAtom, groupedTrailersAtom, shiftTotalsAtom } from '../signals/signals';
import '../App.css';
import { shiftDockCapacity } from '../signals/signals';
import RenderTrailers from './RenderTrailers';

const formatDateWithoutTZ = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'UTC'
  });
};

const getColor = (count: number) => {
    if (count >= 80 && count < 100) {
        return 'orange';
    } else if (count >= 50 && count < 80) {
        return 'yellow';
    } else if (count < 50) {
        return 'green';
    } else {
        return 'red'; // For count >= 100 or other cases
    }
}

const RadialBarChart = () => {
    const [{ groups, sortedDates }] = useAtom(groupedTrailersAtom);
    const [shiftTotals] = useAtom(shiftTotalsAtom)
    const [dailyTotals] = useAtom(dailyTotalsAtom)
    const [selectedDock, setSelectedDock] = useState<{
        dock: string;
        shift: string;
        opDate: string;
        trailers: any[];
    } | null>(null);
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
                  <h3 className="shift-header" style={{textAlign: 'center'}}>{shift} Shift</h3>
                  <div key={shift}
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-evenly', 
                        alignItems: 'center',
                        marginBottom: '3%', 
                        marginTop: '3%', 
                        width: '90%',
                        flexWrap: 'wrap',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}
                    >
                  {sortedDocks.map(dock => {
                    const dockTrailers = docks[dock].sort((a, b) => {
                      const timeA = a.schedArrival ? new Date(a.schedArrival).getTime() : 0;
                      const timeB = b.schedArrival ? new Date(b.schedArrival).getTime() : 0;
                      return timeA - timeB; 
                    });
                    const percentage = (dockTrailers.length / (shiftDockCapacity.get(shift)?.[dock] || 10)) * 100;
                        return (
                            <div
                                key={dock}
                                onClick={() => setSelectedDock({
                                  dock,
                                  shift,
                                  opDate,
                                  trailers: dockTrailers
                                })}
                                style={{cursor: 'pointer'}}
                                >
                                    <div className="radial-item">
                                        <div className="label" style={{marginBottom: '3%'}}><h4>{dock} Dock</h4><h5> {shift} Shift {opDate}</h5></div>
                                            <div 
                                                className="radial-chart chart-1"
                                                data-progress={percentage.toFixed(0)}
                                                style={{
                                                    marginLeft: 'auto',
                                                    marginRight: 'auto',
                                                    '--progress': `${(dockTrailers.length / shiftDockCapacity.get(shift)?.[dock] || 10) * 100}`,
                                                    '--color': `${getColor((dockTrailers.length / (shiftDockCapacity.get(shift)?.[dock] || 10) * 100))}`,
                                                } as React.CSSProperties}
                                            >
                                        </div>                         
                                        <div className="label" style={{marginTop: '3%'}}>{shiftDockCapacity.get(shift)?.[dock] - dockTrailers.length} Spaces Available</div>
                                        <div className="label" style={{marginBottom: '7%'}}>{dockTrailers.length} / {shiftDockCapacity.get(shift)?.[dock]}</div>
                                        {selectedDock?.dock === dock && selectedDock.shift === shift && selectedDock.opDate === opDate && (
                                          <RenderTrailers {...selectedDock} />
                                        )}
                                    </div>
                            </div>
                    );
                  })}
                  </div>
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

export default RadialBarChart;
