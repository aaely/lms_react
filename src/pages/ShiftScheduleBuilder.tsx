import { useAtom } from 'jotai/react';
import Papa from 'papaparse';
import { allTrls as a } from '../signals/signals';
import { splitByDock } from '../signals/signals';
import { useState } from 'react';



const ShiftScheduleBuilder = () => {
    const [allTrls, setAllTrls] = useAtom(a);
    const [split] = useAtom(splitByDock);
    const [activeDock, setActiveDock] = useState(Object.keys(split)[0] || '');
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: false,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedData: any = results.data.map((row: any) => ({
                        dateShift: row[0],
                        hour: row[1],              
                        lmsAccent: row[2],         
                        dockCode: row[3],          
                        acaType: row[4],           
                        status: row[5],            
                        routeId: row[6],           
                        scac: row[7],              
                        trailer1: row[8],          
                        trailer2: row[9],          
                        firstSupplier: row[10],    
                        dockStopSequence: row[11], 
                        planStartDate: row[12],    
                        planStartTime: row[13],    
                        scheduleStartDate: row[14],
                        adjustedStartTime: row[15],
                        scheduleEndDate: row[16],  
                        scheduleEndTime: row[17],  
                        gateArrivalTime: row[19],  
                        actualStartTime: row[20],  
                        actualEndTime: row[21],    
                        statusOX: row[22],         
                        comments: row[23],         
                        maxPerHour: row[24],       
                        usYard: row[25]            
                    }));
                    setAllTrls(parsedData);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    }
/*
    const renderAll = () => {
    return((
        <div style={{
                width: '100%',
                maxWidth: '100vw',
                overflowX: 'auto',
                marginTop: '20px',
                border: '1px solid #ddd',
                borderRadius: '4px'
            }}>
                <table>
                <thead>
                    <tr>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Date/Shift</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Hour</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>LMS/Accent</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Code</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Aca Type</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Status</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Route Id</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Scac</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer1</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer2</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>1st Supplier</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Stop Sequence</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Date</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule Start Date</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Adjusted Start Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Date</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Gate Arrival Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Actual Start Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Actual End Time</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Status O/X</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Comments</th>
                        <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Max Per Hour</th>
                    </tr>
                </thead>
                <tbody>
                    {(allTrls as any).map((trl: any, index: number) => (
                        <tr key={index} style={{borderBottom: '1px solid #eee', position: 'sticky', backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff'}}>
                            <td>{trl.dateShift}</td>
                            <td>{trl.hour}</td>
                            <td>{trl.lmsAccent}</td>
                            <td>{trl.dockCode}</td>
                            <td>{trl.acaType}</td>
                            <td>{trl.status}</td>
                            <td>{trl.routeId}</td>
                            <td>{trl.scac}</td>
                            <td>{trl.trailer1}</td>
                            <td>{trl.trailer2}</td>
                            <td>{trl.firstSupplier}</td>
                            <td>{trl.dockStopSequence}</td>
                            <td>{trl.adjustedStartTime}</td>
                            <td>{trl.scheduleEndDate}</td>
                            <td>{trl.scheduleEndTime}</td>
                            <td>{trl.actualStartTime}</td>
                            <td>{trl.statusOX}</td>
                            <td>{trl.comments}</td>
                            <td>{trl.maxPerHour}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
    ))
}
*/
    return(
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <h1 style={{textAlign: 'center', marginTop: '5%'}}>Shift Schedule Builder</h1>
            <input type="file" accept=".csv" onChange={handleFileUpload} style={{marginTop: '2%'}} />
            <a href="/" className="btn btn-secondary mt-3">
                <i className="bi bi-arrow-left"></i> Back to Landing
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
                        Dock {dockCode} 
                    </button>
                    ))}
                </div>
                {/* Active Dock Content */}
                {activeDock && split[activeDock] && (
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Date/Shift</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Hour</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Code</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Aca Type</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Status</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Route Id</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Scac</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer1</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Trailer2</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>1st Supplier</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Dock Stop Sequence</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Date</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Plan Start Time</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule Start Date</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Adjusted Start Time</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Date</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Schedule End Time</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Comments</th>
                            <th style={{padding: '12px', borderBottom: '2px solid #333', whiteSpace: 'nowrap'}}>Max Per Hour</th>
                        </tr>
                        </thead>
                        <tbody>
                        {split[activeDock].map((trl, index) => {
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
                            return(
                                <tr key={index} style={{
                                    borderBottom: '1px solid #eee', position: 'sticky', 
                                    backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff'
                                    }}>
                                    <td>{trl.dateShift}</td>
                                    <td>{trl.hour}</td>
                                    <td>{trl.dockCode}</td>
                                    <td>{trl.acaType}</td>
                                    <td>{trl.status}</td>
                                    <td>{trl.routeId}</td>
                                    <td>{trl.scac}</td>
                                    <td>{trl.trailer1}</td>
                                    <td>{trl.trailer2}</td>
                                    <td>{trl.firstSupplier}</td>
                                    <td>{trl.dockStopSequence}</td>
                                    <td>{trl.adjustedStartTime}</td>
                                    <td>{trl.scheduleEndDate}</td>
                                    <td>{trl.scheduleEndTime}</td>
                                    <td>{trl.comments}</td>
                                    <td>{trl.maxPerHour}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    </div>
                )}
                </div>
        </div>
    )
}

export default ShiftScheduleBuilder