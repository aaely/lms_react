import { useEffect } from 'react'
import Papa from 'papaparse'
import { useAtom } from 'jotai/react';
import { trls as t } from '../signals/signals';
import { format, parse, isBefore, addDays } from 'date-fns';
import '../App.css';
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

export const getCST = (schedArrivalStr: string) => {
    if (!schedArrivalStr) return 'Unknown';
  
    try {
        // Parse "mm/dd/yy hh:mm am/pm" format
        const s = schedArrivalStr + ' UTC'
        const dateObj = new Date(s).toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
            hour: '2-digit',    
            minute: '2-digit',  
            hour12: true
        });
        return dateObj.replace(',','');
        
    } catch (error) {
        console.error('Error parsing date:', schedArrivalStr, error);
        return 'Invalid Date';
    }
}

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
                    loadNo: row[3],
                    routePrefix: row[5],
                    routeId: row[6],
                    status: row[8],
                    stat2: row[9],
                    scac: row[11],
                    trailer: row[13],
                    rNote: row[14],
                    schedArrival: row[17],
                    schedDepart: row[18],
                    location: row[22],
                    acctorId: row[23]
                }));

                const filteredData = parsedData.filter((trl: any) => {
                    const status = (trl.status || '').toLowerCase();
                    const stat2 = (trl.stat2 || '').toLowerCase();
                    const trailer = (trl.trailer || '').trim();
                    
                    return !status.includes('cancel') && 
                        !stat2.includes('cancel') && 
                        trailer.length > 0 &&
                        !trailer.toLowerCase().includes('null') /*&&
                        !trl.location.toLowerCase().includes('pamt') &&
                        !trl.location.toLowerCase().includes('gmardpy') &&
                        !trl.location.toLowerCase().includes('gwyp')*/
                });

                const sortedData = filteredData.sort((a: any, b: any) => {
                const dateA = a.schedArrival ? new Date(a.schedArrival) : new Date(0);
                const dateB = b.schedArrival ? new Date(b.schedArrival) : new Date(0);
                
                return dateB.getTime() - dateA.getTime(); // Reversed subtraction
            })

                let uniqueIds = new Set(sortedData.map((item: any) => item.acctorId))
                console.log('unique docks: ', uniqueIds)
                const s = getCST(sortedData[0].schedArrival)
                console.log(s)

                setTrls(sortedData)
                }
            });
        })
        .catch(error => console.error('Error loading Locations.csv:', error));
       /*
        fetch('/Audit_Sheet_Data.csv')
        .then(response => response.text())
        .then(text => {
        Papa.parse(text, {
                header: false,
                skipEmptyLines: true,
                complete: function(results) {
                const parsedData: any = results.data.map((row: any) => ({
                    loadNo: row[2],
                    aca: row[4],
                    status: row[5],
                    dock: row[3],
                    scac: row[7],
                    trailer: row[8],
                    supplier: row[10],
                    schedArrival: row[12] + ' ' + row[13],
                    schedDepart: row[14] + ' ' + row[15],
                    stopSequence: row[11],
                }));
                console.log('parsedData: ', parsedData)
                setTrls(parsedData)
                }
            });
        })
        .catch(error => console.error('Error loading Locations.csv:', error));
        */
    }, [])
    
    return(
        <div>
            <a href="/shifts" className="btn btn-primary mb-3">View Shifts</a>
            <a href="/route" className="btn btn-success mb-3">View Routes</a>
            <a href="/charts" className="btn btn-info mb-3">View Radial Chart</a>
            <PlantView />
        </div>
    )
}

export default Landing