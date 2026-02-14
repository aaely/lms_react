import { useEffect } from 'react'
import Papa from 'papaparse'
import { useAtom } from 'jotai/react';
import { trls as t } from '../signals/signals';
import { format, parse, isBefore, addDays } from 'date-fns';
import '../App.css';
import PlantView from './Trailers'

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
    
    return(
        <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly'    }}>
            <a href="/shifts" className="btn btn-primary mb-3">View Shifts</a>
            <a href="/route" className="btn btn-success mb-3">View Routes</a>
            <a href="/charts" className="btn btn-info mb-3">View Radial Chart</a>
            <a href="/shiftBuilder" className="btn btn-info mb-3">Audit Sheet Builder</a>
            <PlantView />
        </div>
    )
}

export default Landing