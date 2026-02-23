import { format, parse, isBefore, addDays } from 'date-fns';
import '../App.css';
import { user as u } from '../signals/signals';
import Demo from './Demo';
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
    const dateObj = parse(schedArrivalStr, 'MM/dd/yy hh:mm a', new Date());
    
    const cutoffTime = parse('10:00 PM', 'hh:mm a', dateObj);
    
    if (isBefore(cutoffTime, dateObj) || 
        format(dateObj, 'HH:mm') === '22:00') {
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
            id: 0,
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
                <a href="/live" className="btn btn-info mb-3">Live Sheet</a>
                <a onClick={() => handleLogOut()} className="btn btn-danger mb-3">Logout</a>
            </div>
            <Demo />
            <RadialBarChart />
        </div>
    )
}

export default Landing