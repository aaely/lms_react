import { useState, useEffect, useMemo } from 'react';
import { shiftDockCapacity, type LMSRecord } from '../signals/signals';
import '../App.css';
import RenderTrailers from './RenderTrailers';
import { api } from '../utils/api';

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
    if (count >= 80 && count < 100) return 'orange';
    if (count >= 50 && count < 80)  return 'yellow';
    if (count < 50)                  return 'green';
    return 'red';
}

const RadialBarChart = () => {
    const [selectedDock, setSelectedDock] = useState<{
        dock: string;
        shift: string;
        opDate: string;
        trailers: LMSRecord[];
    } | null>(null);
    const [lmsRecords, setLmsRecords] = useState<LMSRecord[]>([])

    useEffect(() => {
        api.get('/api/get_lms')
            .then(res => setLmsRecords(res.data))
            .catch(err => console.error('Failed to fetch LMS records', err))
    }, [])

    const { groups, sortedDates, shiftTotals, dailyTotals } = useMemo(() => {
        const groups: Record<string, Record<string, Record<string, LMSRecord[]>>> = {}

        lmsRecords.forEach(record => {
            const t = record.schedule_arrival_time
            if (!t) return
            const datePart = t.substring(0, 10)           // "2026-06-25"
            const hour    = parseInt(t.substring(11, 13)) // 12
            const shift   = hour >= 6 && hour < 14 ? '1st'
                          : hour >= 14 && hour < 22 ? '2nd'
                          : '3rd'
            let opDate = datePart
            if (hour >= 22) {
                const next = new Date(datePart + 'T00:00:00Z')
                next.setUTCDate(next.getUTCDate() + 1)
                opDate = next.toISOString().slice(0, 10)
            }
            const dock = record.dock
            if (!groups[opDate]) groups[opDate] = {}
            if (!groups[opDate][shift]) groups[opDate][shift] = {}
            if (!groups[opDate][shift][dock]) groups[opDate][shift][dock] = []
            groups[opDate][shift][dock].push(record)
        })

        const sortedDates = Object.keys(groups).sort((a, b) => {
            if (a === 'Unknown' || a === 'Invalid Date') return 1
            if (b === 'Unknown' || b === 'Invalid Date') return -1
            return new Date(a).getTime() - new Date(b).getTime()
        })

        const dailyTotals: Record<string, number> = {}
        const shiftTotals: Record<string, Record<string, number>> = {}

        sortedDates.forEach(date => {
            dailyTotals[date] = 0
            shiftTotals[date] = {}
            Object.keys(groups[date]).forEach(shift => {
                const count = Object.values(groups[date][shift]).reduce((sum, arr) => sum + arr.length, 0)
                shiftTotals[date][shift] = count
                dailyTotals[date] += count
            })
        })

        return { groups, sortedDates, shiftTotals, dailyTotals }
    }, [lmsRecords])

  return(
    <div className="plant-view">
      <h1 style={{marginTop: '3%', marginBottom: '3%'}}>
        Dock Forecast
      </h1>
      {sortedDates.map(opDate => {
        const shifts = groups[opDate];
        const sortedShifts = Object.keys(shifts).sort((a, b) => {
          const shiftOrder = ['1st', '2nd', '3rd'];
          return shiftOrder.indexOf(a) - shiftOrder.indexOf(b);
        })
        return (
          <div key={opDate} className="operational-day-section">
            <h2 className="date-header">
              {formatDateWithoutTZ(opDate)}   <br />
              Total Trailers: {dailyTotals[opDate] || 0}
              <br />
              {sortedShifts.map(shift => (
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
                  <div
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
                    const dockTrailers = [...docks[dock]].sort((a, b) => {
                      const timeA = a.schedule_arrival_time ? new Date(a.schedule_arrival_time).getTime() : 0;
                      const timeB = b.schedule_arrival_time ? new Date(b.schedule_arrival_time).getTime() : 0;
                      return timeA - timeB;
                    });
                    const percentage = (dockTrailers.length / (shiftDockCapacity.get(shift)?.[dock] || 10)) * 100;
                    const updateDock = (d: { dock: string; shift: string; opDate: string; trailers: LMSRecord[] }) => {
                      setSelectedDock(prev =>
                        prev?.dock === d.dock && prev?.opDate === d.opDate && prev?.shift === d.shift
                          ? null
                          : d
                      )
                    }
                        return (
                            <div key={dock}>
                                <div className="radial-item">
                                    <div className="label" style={{marginBottom: '3%'}}><h4>{dock} Dock</h4><h5> {shift} Shift {opDate}</h5></div>
                                    <div
                                        className="radial-chart chart-1"
                                        data-progress={percentage.toFixed(0)}
                                        style={{
                                            cursor: 'pointer',
                                            marginLeft: 'auto',
                                            marginRight: 'auto',
                                            '--progress': `${percentage}`,
                                            '--color': `${getColor(percentage)}`,
                                        } as React.CSSProperties}
                                        onClick={() => updateDock({ dock, shift, opDate, trailers: dockTrailers })}
                                    />
                                    <div className="label" style={{marginTop: '3%'}}>{(shiftDockCapacity.get(shift)?.[dock] ?? 0) - dockTrailers.length} Spaces Available</div>
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
