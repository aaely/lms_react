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
  hour: 0,
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
  loadComments: ''
};

const initialTrailerRecord: TrailerRecord = {
  lowestDoh: '',
  hour: 0,
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
  origin: '',
  loadComments: '',
  dockComments: '',
  lateComments: ''
}

export const trailerForm = atomWithStorage<TrailerForm>(
  'trailerForm-storage-key',
  initialTrailerForm
);


export interface TrailerForm {
  hour: number;
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
  uuid?: string;
  lowestDoh: string;
  loadComments: string;
}

export interface TrailerRecord extends TrailerForm {
  uuid: string;
  dateShift: string;  
  origin: string;
  dockComments: string;
  lateComments: string;
}

export interface User {
  email: string,
  accessToken: string,
  refreshToken: string,
  role: string
}

export const initialUser = {
  email: '',
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

const initialDyCommLogForm = {
  loadNum: '',
  trailer: '',
  scac: '',
  route: '',
  dock: '',
  location: '',
  deliveryDate: '',
  deliveryTime: '',
  supplier: '',
  part: '',
  pdt: '',
}

const initialDyCommLog = {
  loadNum: '',
  trailer: '',
  scac: '',
  route: '',
  dock: '',
  location: '',
  deliveryDate: '',
  deliveryTime: '',
  supplier: '',
  part: '',
  pdt: '',
  createdBy: ''
}


const initialExceptionLog = {
  loadNum: '',
  dock: '',
  type: '',
  status: '',
  route: '',
  scac: '',
  trailer1: '',
  trailer2: '',
  supplier: '',
  dockSequence: '',
  originalDate: '',
  originalTime: '',
  newDate: '',
  newTime: '',
  newEndDate: '',
  newEndTime: '',
  comment: '',
}

const initialIoForm = {
  trailer: '',
  sids: [],
  parts: [],
  status: '',
  comments: '',
  destination: '',
  originalDate: '',
  scheduleDate: '',
  scheduleTime: '',
  scac: '',
}

export interface DyCommLogForm {
  loadNum: string;
  trailer: string;
  scac: string;
  route: string;
  dock: string;
  location: string;
  deliveryDate: string;
  deliveryTime: string;
  supplier: string;
  part: string;
  pdt: string;
}

export interface DyCommLog extends DyCommLogForm {
  createdBy: string;
};

export interface ExceptionLogForm {
  loadNum: string;
  dock: string;
  type: string;
  status: string;
  route: string;
  scac: string;
  trailer1: string;
  trailer2: string;
  supplier: string;
  dockSequence: string;
  originalDate: string;
  originalTime: string;
  newDate: string;
  newTime: string;
  newEndDate: string;
  newEndTime: string;
  comment: string;
}


export interface ExceptionLog extends ExceptionLogForm {
  requestor: string;
};

export interface InTransit {
  trailer: string;
  sid: string;
  part: string;
  quantity: string;
  duns: string;
  cisco: string;
  destination: string;
  supplier: string;
  location: string;
}

export interface IoForm {
  trailer: string;
  sids: string[];
  parts: string[];
  status: string;
  comments: string;
  destination: string;
  scheduleDate: string;
  scheduleTime: string;
  originalDate: string;
  scac: string;
}

export interface PartInfo {
  number: string;
  duns: string;
  supplier: string;
  desc: string;
  deck: string;
  dock: string;
  country: string;
}

interface Schedule {
  Comments: string;
  Destination: string;
  OriginalDate: string;
  ScheduleDate: string;
  ScheduleTime: string;
  Status: string;
  TrailerID: string;
  Supplier: string;
  Scac: string;
  Location: string;
}

export interface EditedIo {
  Trailer: string;
  Schedule: Schedule;
  Parts: string[];
  Sids: string[];
}

export interface DeliveredTrailer {
    trailer_id:    string
    delivery_date: string
    Comments:      string
    Destination:   string
    OriginalDate:  string
    ScheduleDate:  string
    ScheduleTime:  string
    Status:        string
    Supplier:      string
    Scac:          string
    parts:         string[]
    sids:          string[]
}

export interface PartASL {
  deck:     string;
  part:     string;
  duns:     string;
  bank:     number;
  supplier: string;
  doh:      number;
  desc:     string;
  cbal:     number;
  day1:     number;
  day2:     number;
  day3:     number;
  day4:     number;
  day5:     number;
  day6:     number;
  day7:     number;
  day8:     number;
  day9:     number;
  day10:    number;
  day11:    number;
  day12:    number;
  day13:    number;
  day14:    number;
  day15:    number;
  day16:    number;
  day17:    number;
  day18:    number;
  day19:    number;
  day20:    number;
  day21:    number;
}

export interface RailASL extends PartASL {
  adjCbal: number;
  adjDoH: number | null;
}

export interface PartOut {
    part:      string
    day1_hr1:  number
    day1_hr2:  number
    day1_hr3:  number
    day1_hr4:  number
    day1_hr5:  number
    day1_hr6:  number
    day1_hr7:  number
    day1_hr8:  number
    day1_hr9:  number
    day1_hr10: number
    day1_hr11: number
    day1_hr12: number
    day1_hr13: number
    day1_hr14: number
    day1_hr15: number
    day1_hr16: number
    day1_hr17: number
    day1_hr18: number
    day1_hr19: number
    day1_hr20: number
    day1_hr21: number
    day1_hr22: number
    day1_hr23: number
    day1_hr24: number
    day2_hr1:  number
    day2_hr2:  number
    day2_hr3:  number
    day2_hr4:  number
    day2_hr5:  number
    day2_hr6:  number
    day2_hr7:  number
    day2_hr8:  number
    day2_hr9:  number
    day2_hr10: number
    day2_hr11: number
    day2_hr12: number
    day2_hr13: number
    day2_hr14: number
    day2_hr15: number
    day2_hr16: number
    day2_hr17: number
    day2_hr18: number
    day2_hr19: number
    day2_hr20: number
    day2_hr21: number
    day2_hr22: number
    day2_hr23: number
    day2_hr24: number
}

export interface ShiftAssignment {
    user_name: string
    role:      string
    position:  string
    task:      string
    task_type: string
    full_name: string
}

export interface SaturdayCount {
    user_name:        string
    full_name:        string
    position:         string
    shift:            string
    saturdays_worked: number
    saturdays_off:    number
    mondays_worked:   number
    mondays_off:      number
}

export interface DeckCoverage {
    deck:      string
    user_name: string | null
}

export interface ShiftDetail {
    shift:          string
    day_key:        string
    shift_status:   string
    assigned:       ShiftAssignment[]
    deck_coverage:  DeckCoverage[]
}

export interface DayDetailProps {
    day:        DaySchedule
    startDate:  string
    onClose:    () => void
}

export interface ShiftSlot {
    shift:    string
    shift_status: string
    shift_reason: string
    assigned: ShiftAssignment[]
}

export interface DaySchedule {
    date:   string
    name:   string
    offset: number
    shifts: ShiftSlot[]
}

export interface WeekSchedule {
    start_date: string
    days:       DaySchedule[]
}

export interface RailASN extends PartASN {
  isStaged:     boolean;
}

export interface PartASN {
  scac:         string;
  trailer:      string;
  deck:         string;
  part:         string;
  duns:         string;
  quantity:     number;
  status:       number;
  sid:          string;
  countComment: string;
  shipComment:  string;
  shipDate:     string;
  dock:         string;
  eda:          string;
  eta:          string;
}

export interface StagedTrailerEntry {
    trailer:  string
    dock:     string
    eda:      string
    eta:      string
    shipDate: string
    sids:     string[]
    decks:    string[]
    parts: {
        part:          string
        quantity:      number
        adjDohOnStage: number | null   
        newDoh:        number | null
    }[]
}

export const initialEditedIo: EditedIo = {
  Trailer: "",
  Schedule: {
    Comments: "",
    Destination: "",
    OriginalDate: "",
    ScheduleDate: "",
    ScheduleTime: "",
    TrailerID: "",
    Status: "",
    Supplier: "",
    Scac: "",
    Location: "",
  },
  Parts: [],
  Sids: [],
};

export const eDockStagedTrailers = atomWithStorage<Record<string, StagedTrailerEntry>>('stagedTrailers', {})
export const eDockPart = atomWithStorage<Record<string, RailASL>>('eDockPart', {})
export const eDockASN = atomWithStorage<Record<string, RailASN[]>>('eDockASN', {})
export const ioForm = atomWithStorage<IoForm>('ioForm', initialIoForm)
export const stagedTrailers = atomWithStorage<Record<string, StagedTrailerEntry>>('stagedTrailers', {})
export const editedIo = atomWithStorage<EditedIo>('editedIo', initialEditedIo)
export const editedExceptionEntry = atomWithStorage<ExceptionLogForm>('editedExceptionEntry', initialExceptionLog)
export const dyCommLogForm = atomWithStorage<DyCommLogForm>('dyCommLogForm', initialDyCommLogForm)
export const dyCommLog = atomWithStorage<DyCommLog>('dyCommLog', initialDyCommLog)
export const exceptionLogForm = atomWithStorage<ExceptionLogForm>('exceptionLogForm', initialExceptionLog)
export const rescheduled = atomWithStorage<TrailerRecord[]>('rescheduled', [])
export const user = atomWithStorage<User>('user', initialUser)
export const trls: any = atomWithStorage('trailers', []);
export const searchRoute = atom('');
export const liveTrailers = atomWithStorage<TrailerRecord[]>('liveTrailers', [])
export const filteredTrailers = atomWithStorage<TrailerRecord[]>('filteredTrailers', [])
export const allTrls = atomWithStorage<TrailerRecord[]>('allTrls', []);
export const editedTrl = atomWithStorage<TrailerRecord>('editedTrl', initialTrailerRecord)
export const partsDuns = atom([])
export const routeDuns = atom(new Map())
export const lowestDoh = atomWithStorage<Record<string, number>>('lowestDoh', {})
export const railPart = atomWithStorage<Record<string, RailASL>>('railPart', {})
export const hotPart = atom<Record<string, PartASL>>({})
export const railASN = atomWithStorage<Record<string, RailASN[]>>('railASN', {})
export const hotASN = atomWithStorage<Record<string, PartASN[]>>('hotASN', {})
export const door = atom('')
export const showSetDoor = atom(false)
export const step = atom(0)
export const gmap = atom(null)
export const skipped = atomWithStorage('skipped', new Set<number>())
export const tab = atom(0)
export const inTransit = atom<InTransit[]>([])
export const ioScreen = atom(0)
export const liveScreen = atom(0)

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
  ['1st', {'BE': 15, 'BN': 8, 'E': 8, 'F': 7, 'F1': 7, 'A': 1, 'U': 56, 'V': 36, 'BW': 10}],
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