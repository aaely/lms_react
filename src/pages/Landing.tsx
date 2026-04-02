import { format, parse, addDays } from 'date-fns';
import '../App.css';
import { user as u } from '../signals/signals';
import { useAtom } from 'jotai';
import RadialBarChart from './RadialBarChart';

export const getDock = (dock: string, loc: string) => {
        if (loc.toLowerCase().includes('avancez')) {
            return 'V'
        }
        if (loc.toLowerCase().includes('univ')) {
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
            case '18008-BW':
                return 'BW'
            case '18008':
                return 'BW'
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
    const dateObj = parse(schedArrivalStr, 'yyyy-MM-dd HH:mm:ss.SSS', new Date());
    
    const cutoffHour = 22; // 10:00 PM
    const hour = dateObj.getHours();

    if (hour >= cutoffHour) {
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

    const [, setUser] = useAtom(u)

    const handleLogOut = () => {
        setUser({
            email: '',
            accessToken: '',
            refreshToken: '',
            role: ''
        })
    }
    
    return(
        <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly'}}>
            <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    width: '90%',
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    marginLeft: 'auto',
                    marginRight: 'auto'
            }}>
                <a href="/route" className="btn btn-success mb-3">View Routes</a>
                <a href="/shiftBuilder" className="btn btn-info mb-3">Audit Sheet Builder</a>
                <a href="/exception" className="btn btn-info mb-3">Exception Log</a>
                <a href="/io" className="btn btn-info mb-3">IO Scheduling</a>
                <a href="/dy" className="btn btn-info mb-3">DY Communication Log</a>
                <a href="/calendar" className="btn btn-info mb-3">Calendar</a>
                <a href="/hot" className="btn btn-info mb-3">Hot Parts</a>
                <a href="/rail" className="btn btn-info mb-3">Rail Drill</a>
                <a href="/live" className="btn btn-info mb-3">Live Sheet</a>
                <a href="/scan" className="btn btn-info mb-3">Scan</a>
                <a href="/editUser" className="btn btn-info mb-3">Edit Users</a>
                <a onClick={() => handleLogOut()} className="btn btn-danger mb-3">Logout</a>
            </div>
            <RadialBarChart />
        </div>
    )
}

export default Landing