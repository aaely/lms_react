import { useAtom } from "jotai"
import { allTrls, 
         type ExceptionLog, 
         type TrailerRecord, 
         tab as t, 
         f1Routes,
         routeDuns,
         lowestDoh } from "../signals/signals"
//import { parse } from 'date-fns'
import { api } from "../utils/api";
import useInitParts from "../utils/useInitParts";

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

const GetException = () => {
    const [all, setAll] = useAtom(allTrls)
    const [, setT] = useAtom(t)
    const [rduns] = useAtom(routeDuns)
    const [ldoh] = useAtom(lowestDoh)
    const lowestDohAsMap = new Map(Object.entries(ldoh))

    useInitParts()

    const getExceptions = async () => {
        try {
                const res = await api.get('/api/get_exceptions')
                const e: TrailerRecord[] = res.data.map((entry: ExceptionLog) => ({
                    uuid:              crypto.randomUUID(),
                    dateShift:         `${localDateString()}-${currentShift()}`,
                    hour:              parseInt(entry.newTime?.slice(0, 2) ?? '0'),
                    lmsAccent:         entry.loadNum,
                    dockCode:          entry.dock,
                    acaType:           entry.type,
                    status:            entry.status,
                    routeId:           entry.route,
                    scac:              entry.scac,
                    trailer1:          entry.trailer1,
                    trailer2:          entry.trailer2,
                    firstSupplier:     entry.supplier,
                    dockStopSequence:  entry.dockSequence,
                    planStartDate:     entry.originalDate,
                    planStartTime:     entry.originalTime,
                    scheduleStartDate: entry.newDate,
                    adjustedStartTime: entry.newTime,
                    scheduleEndDate:   entry.newEndDate,
                    scheduleEndTime:   entry.newEndTime,
                    gateArrivalTime:   '',
                    actualStartTime:   '',
                    actualEndTime:     '',
                    statusOX:          '',
                    loadComments:      entry.comment,
                    ryderComments:     '',
                    gmComments:        '',
                    lateComments:      '',
                    dockComments:      '',
                    lowestDoh:         '',
                    door:              ''
                }))
                const shift = currentShift()
                let filtered = e.filter(a => inShiftRange(a.scheduleStartDate, a.adjustedStartTime, shift))
                    .map(a => ({
                        ...a,
                        origin: 'EXCEPTION'
                    }))
                
                const start = [...all, ...filtered]
    
                const filteredData = start.filter((trl: any) => {
                        return !trl.status.toLowerCase().includes('cancel') &&
                            !trl.dockCode.toLowerCase().includes('s') &&
                            !trl.dockCode.toLowerCase().includes('i')
                    });

                    // Step 1: F1 transformations
                const f1Trailers = filteredData.filter((trl: any) => f1Routes.some((route: string) =>
                    trl.routeId?.toLowerCase().includes(route.toLowerCase())
                ))
                    .map((trl: any) => ({
                        ...trl,
                        dockCode: trl.dockCode?.toLowerCase() === 'y' ? trl.dockCode : 'F1'
                    }));

                let workingData = filteredData.map((trl: any) => {
                    const f1Trailer = f1Trailers.find((ft: any) => ft.uuid === trl.uuid);
                    return f1Trailer || trl;
                });

                // Step 2: RUNNING transformations
                const running = workingData.filter((trl: any) => trl.acaType?.toLowerCase().includes('run'))
                    .map((trl: any) => ({
                        ...trl,
                        acaType: trl.acaType?.toLowerCase() === 'run' ? trl.acaType : 'EXPEDITE'
                    }));

                workingData = workingData.map((trl: any) => {
                    const f1Trailer = running.find((ft: any) => ft.uuid === trl.uuid);
                    return f1Trailer || trl;
                });

                // Step 3: VAA to V
                const vaaTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('vaa'))
                    .map((trl: any) => ({ ...trl, dockCode: 'V' }));

                workingData = workingData.map((trl: any) => {
                    const updated = vaaTrailers.find((vt: any) => vt.uuid === trl.uuid);
                    return updated || trl;
                });

                // Step 4: f1 to F1
                const f1 = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('f1'))
                    .map((trl: any) => ({ ...trl, dockCode: 'F1' }));

                    workingData = workingData.map((trl: any) => {
                    const updated = f1.find((vt: any) => vt.uuid === trl.uuid);
                    return updated || trl;
                });

                // Step 5: f to F
                const f = workingData.filter((trl: any) => trl.dockCode?.includes('f'))
                    .map((trl: any) => ({ ...trl, dockCode: 'F' }));

                workingData = workingData.map((trl: any) => {
                    const updated = f.find((vt: any) => vt.uuid === trl.uuid);
                    return updated || trl;
                });

                // Step 6: W to first dock stop
                const wTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('w'))
                    .map((trl: any) => ({
                        ...trl,
                        dockCode: trl.dockStopSequence?.[0] || trl.dockCode
                    }));

                workingData = workingData.map((trl: any) => {
                    const updated = wTrailers.find((wt: any) => wt.uuid === trl.uuid);
                    return updated || trl;
                });

                // Step 7: BE2 to BE
                const be2Trailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('be2'))
                    .map((trl: any) => ({ ...trl, dockCode: 'BE' }));

                workingData = workingData.map((trl: any) => {
                    const updated = be2Trailers.find((bt: any) => bt.uuid === trl.uuid);
                    return updated || trl;
                });

                // Step 8: B to BE
                const bTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase() === 'b')
                    .map((trl: any) => ({ ...trl, dockCode: 'BE' }));

                workingData = workingData.map((trl: any) => {
                    const updated = bTrailers.find((bt: any) => bt.uuid === trl.uuid);
                    return updated || trl;
                });

                // Step 9: BB to BE
                const bbTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('bb'))
                    .map((trl: any) => ({ ...trl, dockCode: 'BE' }));

                workingData = workingData.map((trl: any) => {
                    const updated = bbTrailers.find((bt: any) => bt.uuid === trl.uuid);
                    return updated || trl;
                });

                //Step 10: Create map of lowest doh part to duns, then duns to route
                const enrichedTrailers = workingData.map((trailer: any) => {
                    const partList = rduns.get(trailer.routeId.slice(0, 6)) || [];
                    console.log(partList)
                    let lowestDoh = null;

                    if (partList.length > 0) {
                        const dohValues = partList
                            .map((part: any) => lowestDohAsMap.get(part))
                            .filter((doh: any) => doh !== undefined && doh !== null && !isNaN(doh));

                        if (dohValues.length > 0) {
                            lowestDoh = Math.min(...dohValues);
                        }
                    }

                    return {
                        ...trailer,
                        lowestDoh,
                        dockCode: trailer.dockCode.trim()
                    };
                });
                console.log(enrichedTrailers)
                setAll(enrichedTrailers);
                setT(prev => prev + 1)
            } catch (error) {
                console.log(error)
            }
    }

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
                    <a onClick={() => getExceptions()} className="btn btn-danger mt-3">
                        Get Exception Entries
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

export default GetException