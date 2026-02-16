import { useAtom } from "jotai";
import { useState } from "react";
import Papa from 'papaparse'
import { parse } from 'date-fns';
import { allTrls as atrls, 
         editedTrl as e, 
         splitByDock, 
         f1Routes, 
         editMode as ed,
         activeDock as ad,
         type TrailerRecord,
         routeDuns,
         lowestDoh,
         getShift,
          } from "../signals/signals";
import useInitParts from "../utils/useInitParts";
import { shiftDockCapacity } from '../signals/signals'

const getCardColor = (dockCode: string, activeDock: string, shift: string, total: number) => {
    // Get capacity for this shift, default to null if not found
    const shiftCapacity = shiftDockCapacity.get(shift);
    
    // If no capacity data for this shift, return basic active/inactive colors
    if (!shiftCapacity) {
        return dockCode === activeDock ? 'blue' : 'inherit';
    }
    
    // Get capacity for this specific dock, default to 0 if not found
    const capacity = shiftCapacity[dockCode] ?? 0;
    
    // Compare total against capacity
    if (total > capacity) {
        return dockCode === activeDock ? 'red' : 'orange';
    }
    
    // Within capacity
    return dockCode === activeDock ? 'blue' : 'inherit';
};

const DockSplits = () => {
    const [split] = useAtom(splitByDock);
    const [activeDock, setActiveDock] = useAtom(ad);
    const [allTrls, setAllTrls] = useAtom(atrls)
    const [, setEditedTrl] = useAtom(e)
    const [editMode, setEditMode] = useAtom(ed)
    const [rduns] = useAtom(routeDuns)
    const [ldoh, setLowestDoh] = useAtom(lowestDoh)
    const [currentShift, setCurrentShift] = useState('1st')
    //const [trailers, setTrailers] = useState<TrailerRecord[]>([]);
    //const [, setLoading] = useState(true);
    //const [error, setError] = useState<string | null>(null);

    useInitParts()
    
    const handleRemove = (trl: any) => {
        const newList = (allTrls as any).filter((t: any) => t.uuid !== trl.uuid)
        setAllTrls(newList);
    }

    const handleEdit = (trl: any) => {
        setEditedTrl(trl);
        setEditMode(!editMode);
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedData: any = results.data.map((row: any, index: number) => ({
                        uuid: index,
                        dateShift: row[0],
                        hour: row[1],              
                        lmsAccent: row[2],         
                        dockCode: row[3],          
                        acaType: row[5],           
                        status: row[6],            
                        routeId: row[7],           
                        scac: row[8],              
                        trailer1: row[9],          
                        trailer2: row[10],         
                        firstSupplier: row[11],    
                        dockStopSequence: row[12], 
                        planStartDate: row[13],    
                        planStartTime: row[14],    
                        scheduleStartDate: row[15],    
                        adjustedStartTime: row[16],
                        scheduleEndDate: row[17],  
                        scheduleEndTime: row[18],
                        gateArrivalTime: row[20],  
                        actualStartTime: row[21],  
                        actualEndTime: row[22],    
                        statusOX: row[23],         
                        ryderComments: row[24],
                        GMComments: row[25]        
                    }));

                    const shift = parsedData[12].adjustedStartTime
                    setCurrentShift(getShift(shift))

                    const filteredData: any = parsedData.filter((trl: any) => {
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
                            dockCode: trl.dockCode?.toLowerCase() === 'y' ? trl.dockCode : 'F1' }));

                    let workingData = filteredData.map((trl: any) => {
                        const f1Trailer = f1Trailers.find((ft: any) => ft.uuid === trl.uuid);
                        return f1Trailer || trl;
                    });

                    // Step 3: VAA to V
                    const vaaTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('vaa'))
                        .map((trl: any) => ({ ...trl, dockCode: 'V' }));

                    workingData = workingData.map((trl: any) => {
                        const updated = vaaTrailers.find((vt: any) => vt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    // Step 3: f1 to F1
                    const f1 = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('f1'))
                        .map((trl: any) => ({ ...trl, dockCode: 'F1' }));

                    workingData = workingData.map((trl: any) => {
                        const updated = f1.find((vt: any) => vt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    // Step 4: W to first dock stop
                    const wTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('w'))
                        .map((trl: any) => ({
                            ...trl,
                            dockCode: trl.dockStopSequence?.[0] || trl.dockCode
                        }));

                    workingData = workingData.map((trl: any) => {
                        const updated = wTrailers.find((wt: any) => wt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    // Step 5: BE2 to BE
                    const be2Trailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('be2'))
                        .map((trl: any) => ({ ...trl, dockCode: 'BE' }));

                    workingData = workingData.map((trl: any) => {
                        const updated = be2Trailers.find((bt: any) => bt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    // Step 5: B to BE
                    const bTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase() === 'b')
                        .map((trl: any) => ({ ...trl, dockCode: 'BE' }));

                    workingData = workingData.map((trl: any) => {
                        const updated = bTrailers.find((bt: any) => bt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    // Step 6: BB to BE
                    const bbTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('bb'))
                        .map((trl: any) => ({ ...trl, dockCode: 'BE' }));

                    workingData = workingData.map((trl: any) => {
                        const updated = bbTrailers.find((bt: any) => bt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    const enrichedTrailers = workingData.map((trailer: any) => {
                    const dunsList = rduns.get(trailer.routeId.slice(0,6)) || [];
                    
                    let lowestDoh = null;
                    
                    if (dunsList.length > 0) {
                        const dohValues = dunsList
                            .map((duns: any) => ldoh.get(duns))
                            .filter((doh: any) => doh !== undefined && doh !== null && !isNaN(doh));
                        
                        if (dohValues.length > 0) {
                            lowestDoh = Math.min(...dohValues);
                        }
                    }
                    
                    return {
                        ...trailer,
                        lowestDoh
                    };
                });
                    setAllTrls(enrichedTrailers);
                    
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    }

    const handleFileUpload2 = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedData: any = results.data.map((row: any) => ({
                        part: row[0],
                        duns: row[1],
                        doh: row[2]
                    }));
                    let filtered = parsedData.filter((a: any) => {
                        return a.doh > 0
                    })
                    const newMap = new Map()
                    filtered.forEach((part: any) => {
                        const duns = part.duns
                        const doh = parseFloat(part.doh)
                        if (!newMap.has(duns) || doh < newMap.get(duns)) {
                            newMap.set(duns, doh)
                        }
                    });
                    setLowestDoh(newMap)
                    console.log(ldoh)
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    }

    return(
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%'
        }}>
            <h1 style={{textAlign: 'center', marginTop: '5%'}}>Shift Schedule Builder</h1>
            <input style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '3%'}} type="file" accept=".csv" onChange={handleFileUpload} />
            <input style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '3%'}} type="file" accept=".csv" onChange={handleFileUpload2} />
            <a style={{marginLeft: 'auto', marginRight: 'auto'}} href="/" className="btn btn-secondary mt-3">
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
                            backgroundColor: `${getCardColor(dockCode, activeDock, currentShift, split[dockCode].length)}`,
                            color: activeDock === dockCode ? 'white' : '#333',
                            cursor: 'pointer',
                            marginRight: '5px',
                            borderRadius: '4px 4px 0 0'
                            }}
                        >
                            Dock {dockCode} ({split[dockCode].length}) / {shiftDockCapacity.get(currentShift)[dockCode]}
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
                                'Schedule End Date', 'Schedule End Time', 'Comments',
                                'GM Comments', 'Edit', 'Remove'
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
                            const dateA = parse(a.scheduleStartDate + ' ' + a.adjustedStartTime, 'MM/dd/yyyy HH:mm', new Date());
                            const dateB = parse(b.scheduleStartDate + ' ' + b.adjustedStartTime, 'MM/dd/yyyy HH:mm', new Date());
                            return dateA.getTime() - dateB.getTime();
                        }).map((trl, index) => {
                            const hourlyCount = (trailer: any) => {
                                let count = 0
                                split[activeDock].forEach((t: any) => {
                                    if (t.hour === trailer.hour) {
                                        count++
                                    }
                                })
                                if (count > 9) {
                                    return 'yellow'
                                }
                                return 'inherit'
                            }
                            const routeCount = (trailer: any) => {
                                let count = 0
                                split[activeDock].forEach((t: any) => {
                                    if (t.routeId.slice(0, 6) === trailer.routeId.slice(0,6)) {
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
                                    if (t.hour === hour) {
                                        count++
                                    }
                                })
                                return count
                            }
                            const trailerCount = (trailer: any) => {
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
                            return(
                                <tr key={index} style={{
                                    borderBottom: '1px solid #eee', position: 'sticky', 
                                    backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff'
                                    }}>
                                    <td>{index + 1}</td>
                                    <td>{trl.dateShift}</td>
                                    <td style={{backgroundColor: hourlyCount(trl)}}>{trl.hour} | {countHour(trl.hour)}</td>
                                    <td>{trl.lmsAccent}</td>
                                    <td>{trl.lowestDoh}</td>
                                    <td>{trl.dockCode}</td>
                                    <td>{trl.acaType}</td>
                                    <td>{trl.status}</td>
                                    <td style={{backgroundColor: routeCount(trl)}}>{trl.routeId}</td>
                                    <td>{trl.scac}</td>
                                    <td style={{backgroundColor: trailerCount(trl)}}>{trl.trailer1}</td>
                                    <td>{trl.trailer2}</td>
                                    <td>{trl.firstSupplier}</td>
                                    <td>{trl.dockStopSequence}</td>
                                    <td>{trl.scheduleStartDate}</td>
                                    <td>{trl.adjustedStartTime}</td>
                                    <td>{trl.scheduleEndDate}</td>
                                    <td>{trl.scheduleEndTime}</td>
                                    <td>{trl.ryderComments}</td>
                                    <td>{trl.GMComments}</td>
                                    {<td>
                                        <a onClick={() => handleEdit(trl)} className="btn btn-primary mt-3">
                                            Edit
                                        </a>
                                    </td>}
                                    {<td>
                                        <a onClick={() => handleRemove(trl)} className="btn btn-danger mt-3">
                                            Remove
                                        </a>
                                    </td>}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    </div>
                )}
                </div>
                <a style={{marginLeft: 'auto', marginRight: 'auto'}} href="/final" className="btn btn-secondary mt-3">
                    Finalize
                </a>
        </div>
        )
    }

export default DockSplits