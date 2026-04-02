import { useAtom } from "jotai";
import { parse } from 'date-fns';
import { getCardColor } from "../utils/helpers";
import {
    allTrls as atrls,
    editedTrl as e,
    tab as t,
    splitByDock,
    editMode as ed,
    activeDock as ad,
    type TrailerRecord,
    shiftDockCapacity,
    rescheduled,
} from "../signals/signals";
import { dockGrid } from "../signals/dockGrid";
import useInitParts from "../utils/useInitParts";
import EditTrailer from "./EditTrailer";

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

const DockSplits = () => {
    const [split] = useAtom(splitByDock);
    const [activeDock, setActiveDock] = useAtom(ad);
    const [allTrls, setAllTrls] = useAtom(atrls)
    const [, setEditedTrl] = useAtom(e)
    const [editMode, setEditMode] = useAtom(ed)
    const [, setTab] = useAtom(t)
    const [, setRsch] = useAtom(rescheduled)

    //const [trailers, setTrailers] = useState<TrailerRecord[]>([]);
    //const [, setLoading] = useState(true);
    //const [error, setError] = useState<string | null>(null);

    useInitParts()

    const handleRemove = (trl: any, action: number) => {
        const newList = allTrls.filter((t: TrailerRecord) => t.uuid !== trl.uuid)

        if (action === 1) {
            setRsch(prev => [...prev, trl]);
            setAllTrls(newList);
            return;
        }

        setAllTrls(newList);
    }
    const handleEdit = (trl: any) => {
        setEditedTrl(trl);
        setEditMode(!editMode);
    }

    /*useEffect(() => {
        (async () => {
            try {
                const carryovers = await trailerApi.getCarryOvers()
                const updated = carryovers.trailers.map(a => {
                    return {...a, origin: 'carryover'}
                })
                setAllTrls(updated)
            } catch (error) {
                console.log(error)
            }
        })()
    }, [])*/

    const getBackground = (trl: TrailerRecord, index: number) => {
        if (trl.origin === 'carryover') {
            return 'yellow'
        }
        return index % 2 !== 0 ? '#e9ecef' : 'white'
    }

    const getDockCount = (trls: TrailerRecord[]) => {
        let count = 0
        trls.map(trl => {
            if (trl.origin !== 'carryover') {
                count++
            }
        })
        return count
    }

    const setDockY = (trl: TrailerRecord) => {
        setAllTrls(prev => prev.map(t =>
            t.uuid === trl.uuid
                ? { ...t, dockCode: 'Y' }
                : t
        ));
    }

    const renderSplits = () => {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%'
            }}>
                <h1 style={{ textAlign: 'center', marginTop: '5%' }}>Shift Schedule Builder</h1>
                <a style={{ marginLeft: 'auto', marginRight: 'auto' }} href="/" className="btn btn-secondary mt-3">
                    Back to Landing
                </a>
                <div style={{ padding: '20px' }}>
                    {/* Dock Tabs */}
                    <div style={{
                        display: 'flex',
                        position: 'relative',
                        borderBottom: '1px solid #ddd',
                        marginBottom: '20px',
                        flexWrap: 'wrap',
                        width: '100%'
                    }}>
                        {Object.keys(split).map(dockCode => (
                            <button
                                key={dockCode}
                                onClick={() => setActiveDock(dockCode)}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    backgroundColor: `${getCardColor(dockCode, activeDock, currentShift(), getDockCount(split[dockCode]))}`,
                                    color: activeDock === dockCode ? 'white' : '#333',
                                    cursor: 'pointer',
                                    marginRight: '5px',
                                    borderRadius: '4px 4px 0 0'
                                }}
                            >
                                {dockCode} ({getDockCount(split[dockCode])}) / {shiftDockCapacity.get(currentShift())[dockCode]}
                            </button>
                        ))}
                    </div>
                    {/* Active Dock Content */}
                    {activeDock && split[activeDock] && (
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        {[
                                            '#', 'Date/Shift', 'Hour', 'Load #', 'DOH', 'Dock Code',
                                            'Aca Type', 'Status', 'Route Id', 'Scac', 'Trailer1',
                                            'Trailer2', '1st Supplier', 'Dock Stop Sequence',
                                            'Schedule Start Date', 'Adjusted Start Time',
                                            'Comments'
                                        ].map((header, i) => (
                                            <th key={i} style={{
                                                position: 'sticky',
                                                top: 0,
                                                backgroundColor: '#f5f5f5',  // Light gray background
                                                color: '#333',
                                                padding: '12px',
                                                borderBottom: '2px solid #333',
                                                borderTop: '1px solid #ddd',
                                                whiteSpace: 'nowrap',
                                                zIndex: 10,
                                                boxShadow: 'inset 0 -1px 0 #ddd',  // Clean bottom border
                                                textAlign: 'left',
                                                fontWeight: '600'
                                            }}>
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {split[activeDock].sort((a: any, b: any) => {
                                        const dateA = parse(a.scheduleStartDate + ' ' + a.adjustedStartTime, 'yyyy-MM-dd HH:mm', new Date());
                                        const dateB = parse(b.scheduleStartDate + ' ' + b.adjustedStartTime, 'yyyy-MM-dd HH:mm', new Date());
                                        return dateA.getTime() - dateB.getTime();
                                    }).map((trl, index) => {
                                        const hourlyCount = (trailer: any) => {
                                            let count = 0
                                            split[activeDock].forEach((t: any) => {
                                                if (t.hour === trailer.hour) {
                                                    count++
                                                }
                                            })
                                            const capacity = dockGrid?.get(activeDock)?.get(parseInt(trailer.hour));
                                            if (capacity && count > capacity) {
                                                return 'yellow';
                                            }
                                            return 'inherit'
                                        }
                                        const routeCount = (trailer: any) => {
                                            let count = 0
                                            split[activeDock].forEach((t: TrailerRecord) => {
                                                if (t.routeId.slice(0, 6) === trailer.routeId.slice(0, 6)) {
                                                    count++
                                                }
                                            })
                                            if (count > 1) {
                                                return 'orange'
                                            }
                                            return 'inherit'
                                        }
                                        const countHour = (hour: string) => {
                                            let count = 0
                                            split[activeDock].forEach((t: TrailerRecord) => {
                                                if (parseInt(t.hour as any) == parseInt(hour) && t.origin !== 'carryover') {
                                                    count++
                                                }
                                            })
                                            return count
                                        }
                                        const hourColor = (hour: string) => {
                                            if (hour === '5' || hour === '13' || hour === '21') {
                                                return 'red'
                                            }
                                            return 'inherit'
                                        }
                                        const trailerCount = (trailer: TrailerRecord) => {
                                            let count = 0
                                            split[activeDock].forEach((t: any) => {
                                                if (t.trailer1 === trailer.trailer1) {
                                                    count++
                                                }
                                            })
                                            if (count > 1) {
                                                return 'limegreen'
                                            }
                                            return 'inherit'
                                        }
                                        return (
                                            <tr key={index} style={{
                                                borderBottom: '1px solid #eee', position: 'sticky',
                                                backgroundColor: getBackground(trl, index)
                                            }}>
                                                <td>{index + 1}</td>
                                                <td>{trl.dateShift}</td>
                                                <td style={{ backgroundColor: hourlyCount(trl) }}>{trl.hour} | {countHour(trl.hour)}</td>
                                                <td>{trl.lmsAccent}</td>
                                                <td>{trl.lowestDoh}</td>
                                                <td>{trl.dockCode}</td>
                                                <td>{trl.acaType}</td>
                                                <td>{trl.status}</td>
                                                <td style={{ backgroundColor: routeCount(trl) }}>{trl.routeId}</td>
                                                <td>{trl.scac}</td>
                                                <td style={{ backgroundColor: trailerCount(trl) }}>{trl.trailer1}</td>
                                                <td>{trl.trailer2}</td>
                                                <td>{trl.firstSupplier}</td>
                                                <td>{trl.dockStopSequence}</td>
                                                <td>{trl.scheduleStartDate}</td>
                                                <td style={{ backgroundColor: hourColor(trl.hour) }}>{trl.adjustedStartTime}</td>
                                                <td>{trl.loadComments}</td>
                                                {trl.origin !== 'carryover' &&
                                                    <td>
                                                        <a onClick={() => handleEdit(trl)} className="btn btn-primary mt-3">
                                                            Edit
                                                        </a>
                                                    </td>}
                                                {trl.origin !== 'carryover' &&
                                                    <td>
                                                        <a onClick={() => handleRemove(trl, 0)} className="btn btn-danger mt-3">
                                                            Remove
                                                        </a>
                                                        <a onClick={() => handleRemove(trl, 1)} className="btn btn-warning mt-3">
                                                            Reschedule
                                                        </a>
                                                        <a onClick={() => setDockY(trl)} className="btn btn-warning mt-3">
                                                            DropYard
                                                        </a>
                                                    </td>}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <a style={{ marginLeft: 'auto', marginRight: 'auto' }} onClick={() => setTab(prevTab => prevTab + 1)} className="btn btn-secondary mt-3">
                    Next
                </a>
            </div>
        )
    }

    return (
        <>
            {
                editMode ? <EditTrailer /> : renderSplits()
            }
        </>
    )
}

export default DockSplits