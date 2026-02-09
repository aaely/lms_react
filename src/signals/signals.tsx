import { atomWithStorage } from 'jotai/utils'
import { atom } from 'jotai'
import { getOperationalDate } from '../pages/Landing';

export const trls: any = atomWithStorage('trailers', []);

const getDock = (dock: string, loc: string) => {
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

export const getShift = (timeStr: string): string => {
  if (!timeStr) return 'Unknown';
  const hours = new Date(timeStr).getHours();
  console.log(hours)
    if (hours >= 6 && hours < 14) return '1st';
    if (hours >= 14 && hours < 22) return '2nd';
    return '3rd';
}

// Main derived atom
export const groupedDailyTrailersAtom = atom((get: any) => {
  const trailers = get(trls);
  const groups: Record<string, Record<string, any[]>> = {};
  
  // Grouping logic
  (trailers as any[]).forEach((trailer) => {
    const opDate = getOperationalDate(trailer.schedArrival);
    const dockCode = getDock(trailer.acctorId, trailer.location);
    // Initialize nested structure
    if (!groups[opDate]) {
      groups[opDate] = {};
    }
    if (!groups[opDate][dockCode]) {
      groups[opDate][dockCode] = [];
    }
    
    groups[opDate][dockCode].push(trailer);
  });
  
  // Sort operational dates (newest first)
  const sortedDates = Object.keys(groups).sort((a, b) => {
    if (a === 'Unknown' || a === 'Invalid Date') return 1;
    if (b === 'Unknown' || b === 'Invalid Date') return -1;
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime(); // Descending
  });
  
  // Sort docks within each date, and trailers within each dock
  sortedDates.forEach(date => {
    const dateGroups = groups[date];
    const sortedDocks = Object.keys(dateGroups).sort();
    
    sortedDocks.forEach(dock => {
      dateGroups[dock].sort((a, b) => {
        try {
          const dateA = new Date(a.schedArrival);
          const dateB = new Date(b.schedArrival);
          return dateA.getTime() - dateB.getTime();
        } catch {
          return 0;
        }
      });
    });
  });  
  return { groups, sortedDates };
});

export const getOpDateAndShift = (schedArrival: string): { opDate: string; shift: string } => {
  const dateObj = new Date(schedArrival);
  let opDate = 'Invalid Date';
  let shift = 'Unknown';

  if (!isNaN(dateObj.getTime())) {
    // First, calculate raw operational date (might be tomorrow if ≥22:00)
    const tempDate = new Date(dateObj);
    if (tempDate.getHours() >= 22) {
      tempDate.setDate(tempDate.getDate() + 1);
    }
    opDate = tempDate.toISOString().split('T')[0];

    // For shift, we need the TIME from the ORIGINAL date
    // A trailer at 22:30 belongs to Swing shift of the NEXT operational day
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const timeOnly = `${hours}:${minutes}`;
    shift = getShift(timeOnly);
  }

  return { opDate, shift };
};

export const groupedTrailersAtom = atom((get) => {
  const trailers = get(trls); 
  
  if (!trailers || !Array.isArray(trailers)) {
    return { groups: {}, sortedDates: [] };
  }

  const groups: Record<string, Record<string, Record<string, any[]>>> = {};

  trailers.forEach((trailer) => {
    const opDate = getOperationalDate(trailer.schedArrival);
    const shift = getShift(trailer.schedArrival);
    const dockCode = getDock(trailer.acctorId, trailer.location);
    console.log(trailer, opDate, shift)
    // Initialize the three-level structure
    if (!groups[opDate]) groups[opDate] = {};
    if (!groups[opDate][shift]) groups[opDate][shift] = {};
    if (!groups[opDate][shift][dockCode]) {
      groups[opDate][shift][dockCode] = [];
    }

    groups[opDate][shift][dockCode].push(trailer);
  });

  // Sort dates (newest first), but put Unknown/Invalid at end
  const sortedDates = Object.keys(groups).sort((a, b) => {
    if (a === 'Unknown' || a === 'Invalid Date') return 1;
    if (b === 'Unknown' || b === 'Invalid Date') return -1;
    
    // Convert to dates for proper comparison
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateB.getTime() - dateA.getTime(); // Descending
  });

  // Sort within each group
  sortedDates.forEach(date => {
    const dateGroups = groups[date];
    const sortedShifts = Object.keys(dateGroups).sort((a, b) => {
      const shiftOrder = ['3rd', '1st', '2nd'];
      const indexA = shiftOrder.indexOf(a);
      const indexB = shiftOrder.indexOf(b);
      const result = indexA - indexB;
      
      return result;
    });
    console.log(sortedShifts)
    sortedShifts.forEach(shift => {
      const docks = dateGroups[shift];
      const sortedDocks = Object.keys(docks).sort();
      
      sortedDocks.forEach(dock => {
        docks[dock].sort((a, b) => {
          // Handle invalid dates in sorting
          const timeA = a.schedArrival ? new Date(a.schedArrival).getTime() : 0;
          const timeB = b.schedArrival ? new Date(b.schedArrival).getTime() : 0;
          return timeA - timeB; // Ascending (earliest first)
        });
      });
    });
  });

  return { groups, sortedDates};
});

export const dailyTotalsAtom = atom((get) => {
  const { groups } = get(groupedDailyTrailersAtom);
  const totals: Record<string, number> = {};
  
  Object.entries(groups).forEach(([date, docks]) => {
    totals[date] = Object.values(docks)
      .reduce((sum, trailers) => sum + trailers.length, 0);
  });
  return totals;
});

// Helper atom to get total trailers per shift per date
export const shiftTotalsAtom = atom((get) => {
  const { groups } = get(groupedTrailersAtom);
  const totals: Record<string, Record<string, number>> = {};
  
  Object.entries(groups).forEach(([date, shifts]) => {
    totals[date] = {};
    Object.entries(shifts).forEach(([shift, docks]) => {
      totals[date][shift] = Object.values(docks)
        .reduce((sum, trailers) => sum + trailers.length, 0);
    });
  });
  
  return totals;
});