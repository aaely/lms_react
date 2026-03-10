import { type TrailerRecord } from "../signals/signals";
import { shiftDockCapacity } from "../signals/signals";


export const isDetention = (trailer: TrailerRecord): [boolean, number] => {
        if (!trailer.scheduleStartDate || !trailer.adjustedStartTime) return [false, 0];
        
        if (trailer.actualEndTime || trailer.statusOX === 'L' || !trailer.gateArrivalTime) return [false, 0];
        
        const [month, day, year] = trailer.scheduleStartDate.split('/').map(Number);
        
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
        
        const [month, day, year] = trailer.scheduleStartDate.split('/').map(Number);
        
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