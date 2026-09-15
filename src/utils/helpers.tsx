import { type TrailerRecord } from "../signals/signals";
import { shiftDockCapacity } from "../signals/signals";


export const isDetention = (trailer: TrailerRecord): [boolean, number] => {
        if (!trailer.scheduleStartDate || !trailer.adjustedStartTime) return [false, 0];
        
        if (trailer.actualEndTime || trailer.statusOX === 'L' || !trailer.gateArrivalTime) return [false, 0];
        
        const [year, month, day] = trailer.scheduleStartDate.split('-').map(Number);
        
        const [hours, minutes] = trailer.adjustedStartTime.split(':').map(Number);

        const scheduledDate = new Date(year, month - 1, day, hours, minutes);
        
        const now = new Date();
        
        const diffMs = now.getTime() - scheduledDate.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        //const detentionStartTime = scheduledDate.getTime() + (60 * 60 * 1000)
        return [diffMinutes > 60, diffMinutes]
    };

export const formatDetentionTime = (minutes: number): string => {
    const hrs  = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mins = Math.floor(minutes % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
};

export const isLate = (trailer: TrailerRecord): boolean => {
        if (!trailer.scheduleStartDate || !trailer.adjustedStartTime) return false;
        
        if (trailer.actualStartTime || trailer.actualEndTime) return false;
        
        const [year, month, day] = trailer.scheduleStartDate.split('-').map(Number);
        
        const [hours, minutes] = trailer.adjustedStartTime.split(':').map(Number);

        const scheduledDate = new Date(year, month - 1, day, hours, minutes);
        
        const now = new Date();
        
        const diffMs = now.getTime() - scheduledDate.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        
        return diffMinutes > 15;
    };

export const getBackground = (status: string) => {
        switch (status) {
            case 'O': {
                return 'green'
                }
            case 'R':{
                return 'gray'
                }
            case 'L':{
                return 'red'
                }
            case 'N':{
                return 'red'
                }
            case 'P': {
                return 'orange'
            }
            case 'C': {
                return 'pink'
            }
            case 'A':
                return 'purple'
            default: return 'inherit'
        }
    }

// Sheet dates arrive as strings from CSV but as Excel serial numbers from XLSX
// (sheet_to_json defaults to raw: true), so normalize both to YYYY-MM-DD.
export const formatSheetDate = (val: any): string => {
    if (!val) return ''
    // Drop any time portion ("09/10/2026 06:00:00", "2026-09-10T06:00:00") —
    // serials have no space or T, so they pass through untouched
    const str = String(val).trim().split(/[ T]/)[0]
    if (!str || str === '0') return ''

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str

    // M/D/YYYY or MM/DD/YYYY
    if (str.includes('/')) {
        const [m, d, y] = str.split('/')
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }

    // Excel serial
    if (/^\d+(\.\d+)?$/.test(str)) {
        const date = new Date((parseFloat(str) - 25569) * 86400 * 1000)
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }

    return str
}

export const getStatBackground = (stat: string) => {
        switch (stat) {
            case 'O': {
                return 'orange'
                }
            case 'X': {
                return 'green'
                }
            default: return 'inherit'
        }
    }

export const getCardColor = (dockCode: string, activeDock: string, shift: string, total: number) => {
    // Get capacity for this shift, default to null if not found
    const shiftCapacity = shiftDockCapacity.get(shift);

    // If no capacity data for this shift, return basic active/inactive colors
    if (!shiftCapacity) {
        return dockCode === activeDock ? 'blue' : 'inherit';
    }

    // Get capacity for this specific dock, default to 0 if not found
    const capacity = shiftCapacity[dockCode] ?? 0;

    // Compare total against capacity
    if (total > capacity && capacity !== 0) {
        return dockCode === activeDock ? 'red' : 'orange';
    }

    // Within capacity
    return dockCode === activeDock ? 'blue' : 'inherit';
};