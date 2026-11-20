import { useEffect, useRef, useState } from "react"
import { type ExceptionLog, type TrailerForm } from "../signals/signals"
import { api } from "./api"
import { toDateKey } from "./ioBalance"

/**
 * IO containers as add-on suggestions. An IO trailer is scheduled on the IO page,
 * which files it in the Exception Log as load # "IO-<trailer>" (older entries are
 * just "IO"); those entries are what's offered here, the way LMS loads are for
 * an ordinary load #.
 */

/** A load # meant for an IO container rather than an LMS load. */
export const isIoLoad = (loadNo: string | undefined): boolean => /io/i.test(loadNo ?? '')

const MAX_SUGGESTIONS = 50

// 'HH:MM', from a time that might carry seconds or come as a full timestamp
const hhmm = (t: string): string => {
    const m = /(\d{1,2}):(\d{2})/.exec(t ?? '')
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

// An hour after the start, rolling to the next day past 23:00 — for entries
// saved without an end slot
const hourAfter = (date: string, time: string): { date: string; time: string } => {
    if (!date || !time) return { date, time: '' }
    const [h, mins] = time.split(':')
    const hour = Number(h)
    if (hour < 23) return { date, time: `${String(hour + 1).padStart(2, '0')}:${mins}` }
    const [y, m, d] = date.split('-').map(Number)
    return { date: new Date(y, m - 1, d + 1).toLocaleDateString('en-CA'), time: `00:${mins}` }
}

const startKey = (e: ExceptionLog): string => `${toDateKey(e.newDate)}T${hhmm(e.newTime)}`

/** How an IO entry reads in the dropdown. */
export const ioLabel = (e: ExceptionLog): string => {
    const date = toDateKey(e.newDate)
    const when = date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))} ${hhmm(e.newTime) || '—'}` : 'Unscheduled'
    return `${e.loadNum}  |  Dock ${e.dock || '—'}  |  ${when}${e.supplier ? `  |  ${e.supplier}` : ''}`
}

/**
 * The add-on fields an IO entry fills, mapped as GetException maps entries onto
 * the schedule. acaType and status aren't here: the Live add-on sets its own.
 */
export const ioEntryFields = (e: ExceptionLog): Partial<TrailerForm> => {
    const date = toDateKey(e.newDate)
    const time = hhmm(e.newTime)
    const end = toDateKey(e.newEndDate) && hhmm(e.newEndTime)
        ? { date: toDateKey(e.newEndDate), time: hhmm(e.newEndTime) }
        : hourAfter(date, time)
    return {
        lmsAccent:         e.loadNum,
        routeId:           e.route,
        scac:              e.scac,
        trailer1:          e.trailer1,
        trailer2:          e.trailer2 ?? '',
        firstSupplier:     e.supplier ?? '',
        dockCode:          (e.dock ?? '').toUpperCase().trim(),
        dockStopSequence:  e.dockSequence ?? '',
        planStartDate:     toDateKey(e.originalDate),
        planStartTime:     hhmm(e.originalTime),
        scheduleStartDate: date,
        adjustedStartTime: time,
        scheduleEndDate:   end.date,
        scheduleEndTime:   end.time,
        hour:              time ? parseInt(time) : 0,
        loadComments:      e.comment ?? '',
    }
}

/**
 * IO Exception Log entries matching the load # typed, once it contains "IO",
 * 300 ms after typing stops. The log is fetched on the first IO search and
 * reused while the form is open. Latest schedule first; cancelled entries are
 * left out. Call `picked` with the chosen entry to close the list while the field
 * holds its load #.
 */
const useIoSuggestions = (loadNo: string) => {
    const [suggestions, setSuggestions] = useState<ExceptionLog[]>([])
    const entries = useRef<ExceptionLog[] | null>(null)
    const last = useRef<string | null>(null)

    useEffect(() => {
        const query = loadNo.trim().toLowerCase()
        if (!isIoLoad(query) || last.current === loadNo) {
            setSuggestions([])
            return
        }
        let stale = false
        const timeout = setTimeout(async () => {
            try {
                if (!entries.current) {
                    const res = await api.get<ExceptionLog[]>('/api/get_exceptions')
                    entries.current = res.data.filter(e =>
                        /^io/i.test(e.loadNum ?? '') && !/cancel/i.test(e.status ?? ''))
                }
                if (stale) return
                setSuggestions(entries.current
                    .filter(e => e.loadNum.toLowerCase().includes(query)
                        || (e.trailer1 ?? '').toLowerCase().includes(query.replace(/^io-?/, '') || query))
                    .sort((a, b) => startKey(b).localeCompare(startKey(a)))
                    .slice(0, MAX_SUGGESTIONS))
            } catch (error) {
                console.log(error)
            }
        }, 300)
        return () => { stale = true; clearTimeout(timeout) }
    }, [loadNo])

    const picked = (entry: ExceptionLog) => {
        last.current = entry.loadNum
        setSuggestions([])
    }

    return { suggestions, picked }
}

export default useIoSuggestions
