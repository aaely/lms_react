import { useAtom } from "jotai";
import { useState } from "react";
import Papa from 'papaparse'
import { parse } from 'date-fns';
import { allTrls as atrls, editedTrl as e, splitByDock, f1Routes, editMode as ed } from "../signals/signals";

const DockSplits = () => {
    const [split] = useAtom(splitByDock);
    const [activeDock, setActiveDock] = useState(Object.keys(split)[0] || '');
    const [allTrls, setAllTrls] = useAtom(atrls)
    const [editedTrl, setEditedTrl] = useAtom(e)
    const [editMode, setEditMode] = useAtom(ed)
    
    
    const handleRemove = (trl: any) => {
        const newList = (allTrls as any).filter((t: any) => t.uuid !== trl.uuid)
        setAllTrls(newList);
    }

    const handleEdit = (trl: any) => {
        setEditedTrl(trl);
        setEditMode(!editMode);
        console.log(editedTrl, editMode)
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

                    const filteredData: any = parsedData.filter((trl: any) => {
                        return !trl.status.toLowerCase().includes('cancel') &&
                            !trl.dockCode.toLowerCase().includes('s') &&
                            !trl.dockCode.toLowerCase().includes('i')
                    });

                    // Step 1: F1 transformations
                    const f1Trailers = filteredData.filter((trl: any) => f1Routes.some((route: string) => 
                            trl.routeId?.toLowerCase().includes(route.toLowerCase())
                        ))
                        .map((trl: any) => ({ ...trl, dockCode: 'F1' }));

                    let workingData = filteredData.map((trl: any) => {
                        const f1Trailer = f1Trailers.find((ft: any) => ft.uuid === trl.uuid);
                        return f1Trailer || trl;
                    });

                    // Step 2: Yard trailers (Y)
                    const yardTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('y'))
                        .map((trl: any) => ({
                            ...trl,
                            dockCode: trl.dockStopSequence?.[trl.dockStopSequence.length - 1] || trl.dockCode
                        }));

                    workingData = workingData.map((trl: any) => {
                        const updated = yardTrailers.find((yt: any) => yt.uuid === trl.uuid);
                        return updated || trl;
                    });

                    // Step 3: VAA to V
                    const vaaTrailers = workingData.filter((trl: any) => trl.dockCode?.toLowerCase().includes('vaa'))
                        .map((trl: any) => ({ ...trl, dockCode: 'V' }));

                    workingData = workingData.map((trl: any) => {
                        const updated = vaaTrailers.find((vt: any) => vt.uuid === trl.uuid);
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
                    console.log(workingData)
                    setAllTrls(workingData);
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
            height: '100%'
        }}>
            <h1 style={{textAlign: 'center', marginTop: '5%'}}>Shift Schedule Builder</h1>
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{marginTop: '2%'}} />
            <a href="/" className="btn btn-secondary mt-3">
                Back to Landing
            </a>
            <div style={{ padding: '20px' }}>
                {/* Dock Tabs */}
                <div style={{
                    display: 'flex',
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
                        backgroundColor: activeDock === dockCode ? '#007bff' : '#f8f9fa',
                        color: activeDock === dockCode ? 'white' : '#333',
                        cursor: 'pointer',
                        marginRight: '5px',
                        borderRadius: '4px 4px 0 0'
                        }}
                    >
                        Dock {dockCode} ({split[dockCode].length})
                    </button>
                    ))}
                </div>
                {/* Active Dock Content */}
                {activeDock && split[activeDock] && (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>#</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Date/Shift</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Hour</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Load #</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Code</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Aca Type</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Status</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Route Id</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Scac</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer1</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer2</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>1st Supplier</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Stop Sequence</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule Start Date</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Adjusted Start Time</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Date</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Time</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Comments</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Max Per Hour</th>
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
                                if (count > 8) {
                                    return 'yellow'
                                }
                                return 'inherit'
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
                                    <td style={{backgroundColor: hourlyCount(trl)}}>{trl.hour}</td>
                                    <td>{trl.lmsAccent}</td>
                                    <td>{trl.dockCode}</td>
                                    <td>{trl.acaType}</td>
                                    <td>{trl.status}</td>
                                    <td>{trl.routeId}</td>
                                    <td>{trl.scac}</td>
                                    <td style={{backgroundColor: trailerCount(trl)}}>{trl.trailer1}</td>
                                    <td>{trl.trailer2}</td>
                                    <td>{trl.firstSupplier}</td>
                                    <td>{trl.dockStopSequence}</td>
                                    <td>{trl.scheduleStartDate}</td>
                                    <td>{trl.adjustedStartTime}</td>
                                    <td>{trl.scheduleEndDate}</td>
                                    <td>{trl.scheduleEndTime}</td>
                                    <td>{trl.comments}</td>
                                    <td>{trl.maxPerHour}</td>
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
                <a href="/final" className="btn btn-secondary mt-3">
                    Finalize
                </a>
        </div>
    )
    }

export default DockSplits