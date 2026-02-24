import { atomWithStorage } from 'jotai/utils'
import { atom } from 'jotai'
import { getOperationalDate } from '../pages/Landing';


export const f1Routes: any = [
  'ARM811',
  'ARM101',
  'ARM690',
  'ARM111'
]

export const editMode = atom(false)

const initialTrailerForm: TrailerForm = {
  lowestDoh: '',
  hour: '',
  lmsAccent: '',
  dockCode: '',
  acaType: '',
  status: '',
  routeId: '',
  door: '',
  scac: '',
  trailer1: '',
  trailer2: '',
  firstSupplier: '',
  dockStopSequence: '',
  planStartDate: '',
  planStartTime: '',
  scheduleStartDate: '',
  adjustedStartTime: '',
  scheduleEndDate: '',
  scheduleEndTime: '',
  gateArrivalTime: '',
  actualStartTime: '',
  actualEndTime: '',
  statusOX: '',
  ryderComments: '',
  gmComments: '',
  dateShift: '',
  origin: ''
};

const initialTrailerRecord: TrailerRecord = {
  lowestDoh: '',
  hour: '',
  lmsAccent: '',
  dockCode: '',
  acaType: '',
  status: '',
  routeId: '',
  door: '',
  scac: '',
  trailer1: '',
  trailer2: '',
  firstSupplier: '',
  dockStopSequence: '',
  planStartDate: '',
  planStartTime: '',
  scheduleStartDate: '',
  adjustedStartTime: '',
  scheduleEndDate: '',
  scheduleEndTime: '',
  gateArrivalTime: '',
  actualStartTime: '',
  actualEndTime: '',
  statusOX: '',
  ryderComments: '',
  gmComments: '',
  dateShift: '',
  uuid: '',
  origin: ''
}

export const trailerForm = atomWithStorage<TrailerForm>(
  'trailerForm-storage-key',
  initialTrailerForm
);


export interface TrailerForm {
  hour: string;
  lmsAccent: string;
  dockCode: string;
  acaType: string;
  status: string;
  routeId: string;
  scac: string;
  trailer1: string;
  trailer2: string;
  firstSupplier: string;
  dockStopSequence: string;
  door: string;
  planStartDate: string;
  planStartTime: string;
  scheduleStartDate: string;
  adjustedStartTime: string;
  scheduleEndDate: string;
  scheduleEndTime: string;
  gateArrivalTime: string;
  actualStartTime: string;
  actualEndTime: string;
  dateShift: string,
  statusOX: string;
  ryderComments: string;
  gmComments: string;
  origin: string
  uuid?: string;
  lowestDoh: string;
}

export interface TrailerRecord extends TrailerForm {
  uuid: string;
  dateShift: string;  
}

export interface User {
  email: string,
  id: number,
  accessToken: string,
  refreshToken: string,
  role: string
}

const initialUser = {
  email: '',
  id: 0,
  accessToken: '',
  refreshToken: '',
  role: ''
}

export interface _user {
  email: string,
  id: number,
  role: string
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: _user;
}

export const rescheduled = atomWithStorage<TrailerRecord[]>('rescheduled', [])
export const user = atomWithStorage<User>('user', initialUser)
export const trls: any = atomWithStorage('trailers', []);
export const searchRoute = atom('');
export const allTrls = atomWithStorage<TrailerRecord[]>('allTrls', []);
export const editedTrl = atomWithStorage<TrailerRecord>('editedTrl', initialTrailerRecord)
export const partsDuns = atom([])
export const routeDuns = atom(new Map())
export const lowestDoh = atom(new Map())
export const door = atom('')
export const showSetDoor = atom(false)

const getDock = (dock: string, loc: string) => {
        if (loc?.toLowerCase().includes('avancez')) {
            return 'V'
        }
        if (loc?.toLowerCase().includes('univ')) {
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
            case '18008':
                return 'BW'
            default: return dock;
        }
    }

export const token = atomWithStorage('token', '')

export const getShift = (timeStr: string): string => {
  if (!timeStr) return 'Unknown';
  const hours = new Date(timeStr).getHours();
    if (hours >= 6 && hours < 14) return '1st';
    if (hours >= 14 && hours < 22) return '2nd';
    return '3rd';
}

export const shiftDockCapacity: any = new Map([
  ['1st', {'BE': 15, 'BN': 8, 'E': 8, 'F': 7, 'F1': 6, 'A': 1, 'U': 56, 'V': 36, 'BW': 10}],
  ['2nd', {'BE': 17, 'BN': 8, 'E': 8, 'F': 7, 'F1': 6, 'A': 2, 'U': 57, 'V': 35, 'BW': 10}],
  ['3rd', {'BE': 17, 'BN': 8, 'E': 8, 'F': 7, 'F1': 7, 'A': 1, 'U': 57, 'V': 36, 'BW': 10}]
]);

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

export const ws: any = atom({
    key: 'ws',
    default: []
})

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
    return dateB.getTime() - dateA.getTime();
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
    sortedShifts.forEach(shift => {
      const docks = dateGroups[shift];
      const sortedDocks = Object.keys(docks).sort();
      
      sortedDocks.forEach(dock => {
        docks[dock].sort((a, b) => {
          const timeA = a.schedArrival ? new Date(a.schedArrival).getTime() : 0;
          const timeB = b.schedArrival ? new Date(b.schedArrival).getTime() : 0;
          return timeA - timeB;
        });
      });
    });
  });

  return { groups, sortedDates};
});

export const activeDock = atomWithStorage('activeDock', '')
export const role = atomWithStorage('role', '')

export const dailyTotalsAtom = atom((get) => {
  const { groups } = get(groupedDailyTrailersAtom);
  const totals: Record<string, number> = {};
  
  Object.entries(groups).forEach(([date, docks]) => {
    totals[date] = Object.values(docks)
      .reduce((sum, trailers) => sum + trailers.length, 0);
  });
  return totals;
});

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

export const filterByRoute = atom((get) => {
  const trailers = get(trls);
  const searchTerm = get(searchRoute).toLowerCase();
  console.log(searchTerm)
  if (!searchTerm.trim()) {
    return trailers;
  }
  
  return (trailers as any).filter((trailer: any) => 
    trailer.routeId?.toLowerCase().includes(searchTerm)
  );
});

export const splitByDock = atom((get) => {
  const trailers = get(allTrls);
  const dockGroups: Record<string, any[]> = {};
  (trailers as any).forEach((trailer: any) => {
    if (!dockGroups[trailer.dockCode]) {
      dockGroups[trailer.dockCode] = [];
    }
    dockGroups[trailer.dockCode].push(trailer);
  });
  return dockGroups;
});

export const getBadgeColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'on time':
      return 'success';
    case 'delayed':
      return 'danger';
    case 'scheduled':
      return 'warning';
    case 'arrived':
      return 'primary';
    case 'departed':
      return 'info';
    default:
      return 'secondary';
  }
};