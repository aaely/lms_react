import { type TrailerRecord } from '../signals/signals'

// Board ordering: scheduled start datetime, then start hour/minute, then route.
// Shared so a shift_rolled refetch lands in the same order as a fresh page load.
export const byScheduledStart = (a: TrailerRecord, b: TrailerRecord): number => {
    const dateA = new Date(`${a.scheduleStartDate} ${a.adjustedStartTime}`).getTime()
    const dateB = new Date(`${b.scheduleStartDate} ${b.adjustedStartTime}`).getTime()

    if (dateA !== dateB) return dateA - dateB

    const [hoursA, minsA] = a.adjustedStartTime.split(':').map(Number)
    const [hoursB, minsB] = b.adjustedStartTime.split(':').map(Number)

    if (hoursA !== hoursB) return hoursA - hoursB
    if (minsA !== minsB)   return minsA - minsB

    return (a.routeId || '').localeCompare(b.routeId || '')
}

export const sortTrailers = (trailers: TrailerRecord[]): TrailerRecord[] =>
    [...trailers].sort(byScheduledStart)
