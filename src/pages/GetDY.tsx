import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { dyCommLogForm, type DyCommLog, dyCommLog, type TrailerRecord, allTrls } from "../signals/signals"
import { api } from "../utils/api";

const localDateString = (): string => {
    const d = new Date(Date.now())
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const currentShift = () => {
    const t = new Date()
    const h = t.getHours()
    if (h >= 23 && h < 7) {
        return '1st'
    }
    if (h >= 7 && h < 15) {
        return '2nd'
    } 
    return '3rd'
}

const addOneHour = (dateStr: string, timeStr: string) => {
    const dt = new Date(`${dateStr}T${timeStr}`)
    dt.setHours(dt.getHours() + 1)
    return {
        dateStr: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`,
        timeStr: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`
    }
}

const getShiftDateRange = (shift: string): { start: Date, end: Date } => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()
    const d = today.getDate()

    switch (shift) {
        case '1st':
            return {
                start: new Date(y, m, d, 23, 0),
                end:   new Date(y, m, d + 1, 5, 59)  // next day
            }
        case '2nd':
            return {
                start: new Date(y, m, d, 14, 0),
                end:   new Date(y, m, d, 21, 59)
            }
        case '3rd':
            return {
                start: new Date(y, m, d, 22, 0),
                end:   new Date(y, m, d + 1, 5, 59)  // next day
            }
        default:
            return {
                start: new Date(y, m, d, 0, 0),
                end:   new Date(y, m, d, 23, 59)
            }
    }
}

const inShiftRange = (dateStr: string, timeStr: string, shift: string): boolean => {
    const dt = new Date(`${dateStr}T${timeStr}`)
    const { start, end } = getShiftDateRange(shift)
    return dt >= start && dt <= end
}

const GetDY = () => {
    const [, setForm] = useAtom(dyCommLogForm)
    const [view, ] = useState(0)
    const [edited] = useAtom(dyCommLog)
    const [, setAll] = useAtom(allTrls)

    useEffect(() => {
        (async () => {
            
        })()
    },[view])

    const getDy = async () => {
        try {
                const res = await api.get('/api/get_dy')
                const e: TrailerRecord[] = res.data.map((entry: DyCommLog) => ({
                    uuid:              crypto.randomUUID(),
                    dateShift:         `${localDateString()}-${currentShift()}`,  // ← dateShift not dateString
                    hour:              parseInt(entry.deliveryTime?.slice(0, 2) ?? '0'),  // ← missing field
                    lmsAccent:         entry.loadNum,
                    dockCode:          entry.dock,
                    acaType:           'DropYard',
                    status:            'Active',
                    routeId:           entry.route,
                    scac:              entry.scac,
                    trailer1:          entry.trailer,
                    trailer2:          '',
                    firstSupplier:     entry.supplier,
                    dockStopSequence:  entry.dock,
                    planStartDate:     entry.deliveryDate,
                    planStartTime:     entry.deliveryTime,
                    scheduleStartDate: entry.deliveryDate,
                    adjustedStartTime: entry.deliveryTime,
                    scheduleEndDate:   addOneHour(entry.deliveryDate, entry.deliveryTime).dateStr,
                    scheduleEndTime:   addOneHour(entry.deliveryDate, entry.deliveryTime).timeStr,
                    gateArrivalTime:   '',
                    actualStartTime:   '',
                    actualEndTime:     '',
                    statusOX:          '',
                    loadComments:      '',
                    ryderComments:     '',
                    gmComments:        '',
                    lateComments:      '',
                    dockComments:      '',
                    lowestDoh:         '',
                    door:              ''
                }))
                const shift = currentShift()
                const filtered = e.filter(a => inShiftRange(a.scheduleStartDate, a.adjustedStartTime, shift))
                    .map(a => ({
                        ...a,
                        origin: 'DropYard'
                    }))
                console.log(filtered)
                setAll(prev => [...prev, ...filtered])
            } catch (error) {
                console.log(error)
            }
    }

    useEffect(() => {
        if (!edited.deliveryDate) return
        setForm({
            ...edited,
            deliveryDate: edited.deliveryDate.slice(0, 10)
        })
    }, [edited])

    const renderLog = () => {
        return (
            <>
                <div style={{
                    display: 'flex',
                    width: '90vw',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column'
                }}>
                    <a onClick={() => getDy()} className="btn btn-danger mt-3">
                        Get DropYard Entries
                    </a>
                </div>
            </>
        )
    }

    return (
        <>
            {renderLog()}
        </>
    )

}

export default GetDY