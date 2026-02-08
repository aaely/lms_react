import { useEffect } from 'react'
import Papa from 'papaparse'
import { useAtom } from 'jotai/react';
import { trls as t } from '../signals/signals';
import { format, parse, isBefore, addDays } from 'date-fns';
import PlantView from './Trailers'

export const getDock = (dock: string, loc: string) => {
        if (loc.toLocaleLowerCase().includes('avancez')) {
            return 'V'
        }
        if (loc.toLocaleLowerCase().includes('univ')) {
            return 'U'
        }
        switch (dock) {
            case '18008-AAA':
                return 'A'
            case '18008-FFF':
                return 'F';
            case '18008-EEE':
                return 'E'
            case '18008-F1':
                return 'F1'
            case '18008-DDD':
                return 'D'
            case '18008-BN':
                return 'BN'
            case '18008-P1':
                return 'P'
            case '18008-BE':
                return 'BE'
            default: return dock;
        }
    }

export const getOperationalDate = (schedArrivalStr: string) => {
  if (!schedArrivalStr) return 'Unknown';
  
  try {
    // Parse "mm/dd/yy hh:mm am/pm" format
    const dateObj = parse(schedArrivalStr, 'MM/dd/yy hh:mm a', new Date());
    
    // Check if time is 10:00 PM (22:00) or later
    const cutoffTime = parse('10:00 PM', 'hh:mm a', dateObj);
    
    // Compare just the time portion
    if (isBefore(cutoffTime, dateObj) || 
        format(dateObj, 'HH:mm') === '22:00') {
      // Add 1 day for operational date
      const nextDay = addDays(dateObj, 1);
      return format(nextDay, 'yyyy-MM-dd');
    }
    
    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error parsing date:', schedArrivalStr, error);
    return 'Invalid Date';
  }
};

const Landing = () => {

    const [, setTrls] = useAtom(t);

    useEffect(() => {
        fetch('/LMS.csv')
        .then(response => response.text())
        .then(text => {
        Papa.parse(text, {
                header: false,
                skipEmptyLines: true,
                complete: function(results) {
                const parsedData: any = results.data.map((row: any) => ({
                    loadNo: row[0],
                    routePrefix: row[2],
                    routeId: row[3],
                    status: row[5],
                    stat2: row[6],
                    scac: row[8],
                    trailer: row[10],
                    rNote: row[11],
                    schedArrival: row[14],
                    schedDepart: row[13],
                    location: row[19],
                    acctorId: row[20]
                }));

                const filteredData = parsedData.filter((trl: any) => {
                    const status = (trl.status || '').toLowerCase();
                    const stat2 = (trl.stat2 || '').toLowerCase();
                    const trailer = (trl.trailer || '').trim();
                    
                    return !status.includes('cancel') && 
                        !stat2.includes('cancel') && 
                        trailer.length > 0 &&
                        !trailer.toLowerCase().includes('null')
                });

                const sortedData = filteredData.sort((a: any, b: any) => {
                const dateA = a.schedArrival ? new Date(a.schedArrival) : new Date(0);
                const dateB = b.schedArrival ? new Date(b.schedArrival) : new Date(0);
                
                return dateB.getTime() - dateA.getTime(); // Reversed subtraction
            })

                let uniqueIds = new Set(sortedData.map((item: any) => item.acctorId))
                console.log('unique docks: ', uniqueIds)


                setTrls(sortedData)
                }
            });
        })
        .catch(error => console.error('Error loading Locations.csv:', error));
    }, [])

    return(
        <>
            <a href="/shifts" className="btn btn-primary mb-3">View Shifts</a>

            <PlantView />
            
            {/*<Table striped bordered hover>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Dock</th>
                        <th>Scac</th>
                        <th>Trailer</th>
                        <th>Status</th>
                        <th>Status</th>
                        <th>Prefix</th>
                        <th>Route</th>
                        <th>Scheduled Arrival</th>
                        <th>Scheduled Departure</th>
                        <th>Last Location</th>
                    </tr>
                </thead>
                <tbody>
                    {trls.length === 0 ? (
                        <tr>
                            <td colSpan={11} className="text-center">
                                No trailer data found
                            </td>
                        </tr>
                    ) : (
                        trls?.map((trl: any, index: number) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{getDock(trl.acctorId, trl.location)}</td>
                                <td>{trl.scac}</td>
                                <td>{trl.trailer}</td>
                                <td>{trl.status}</td>
                                <td>{trl.stat2}</td>
                                <td>{trl.routePrefix}</td>
                                <td>{trl.routeId}</td>
                                <td>{getLocalTime(trl.schedArrival)}</td>
                                <td>{getLocalTime(trl.schedDepart)}</td>
                                <td>{trl.location}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>*/}
        </>
    )
}

export default Landing