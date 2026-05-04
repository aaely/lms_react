import Landing from './pages/Landing'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import { useEffect, useState } from 'react'
import { useAtom } from 'jotai';
import { trls as t, user } from './signals/signals';
import  useWS from './utils/useWS'
import Shifts from './pages/Shifts';
import RouteView from './pages/Route';
import LiveSheet from './pages/LiveSheet';
import Papa from 'papaparse'
import NextShift from './pages/NextShift';
import Login from './pages/Login';
import PlantView from './pages/Trailers';
import Circles from './pages/Loader';
import ShiftOverview from './pages/ShiftOverview';
import ScheduleBuilder from './pages/ScheduleBuilder';
import ExLog from './pages/ExceptionLog';
import DyLog from './pages/DyCommLog';
import IO from './pages/IOContainers';
import RailDrill from './pages/RailDrill';
import HotParts from './pages/HotParts';
import Scheduler from './pages/Users';
import EditUser from './pages/EditUser';
import Scan from './pages/Scan';
import EDock from './pages/eDock';
import EDockRoughDraft from './pages/EDockRoughDraft';

function App() {
  //const [t] = useAtom(token)
  const [, setTrls] = useAtom(t);
  const [u, setUser] = useAtom(user)
  const [loading, setLoading] = useState(true)

  useWS()
  
    useEffect(() => {
        fetch('/LMS.csv')
        .then(response => response.text())
        .then(text => {
        Papa.parse(text, {
                header: false,
                skipEmptyLines: true,
                skipFirstNLines: 1,
                complete: function(results) {
                const parsedData: any = results.data.map((row: any) => ({
                    loadNo: row[3],
                    routePrefix: row[5],
                    routeId: row[6],
                    status: row[8],
                    stat2: row[9],
                    scac: row[11],
                    trailer: row[13],
                    rNote: row[14],
                    schedArrival: row[17],
                    schedDepart: row[18],
                    location: row[22],
                    acctorId: row[23]
                }));

                const filteredData = parsedData.filter((trl: any) => {
                    const status = (trl.status || '').toLowerCase();
                    const stat2 = (trl.stat2 || '').toLowerCase();
                    
                    return !status.includes('cancel') && 
                        !stat2.includes('cancel') &&
                        trl.schedArrival > '2026-04-10'
                        //trailer.length > 0 &&
                        /*!trailer.toLowerCase().includes('null') &&
                        !trl.location.toLowerCase().includes('pamt') &&
                        !trl.location.toLowerCase().includes('gmardpy') &&
                        !trl.location.toLowerCase().includes('gwyp')*/
                });

                const sortedData = filteredData.sort((a: any, b: any) => {
                const dateA = a.schedArrival ? new Date(a.schedArrival) : new Date(0);
                const dateB = b.schedArrival ? new Date(b.schedArrival) : new Date(0);
                
                return dateB.getTime() - dateA.getTime(); 
            })

                setTrls(sortedData)
                }
            });
        })
        .catch(error => console.error('Error loading Locations.csv:', error));
    }, [])

    useEffect(() => {
      // Load token from localStorage on mount
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Set your user state with the token
        setUser({ ...u, accessToken: token });
      }
      setLoading(false);
    }, []);

    const roles = ['mfu', 'admin', 'supervisor', 'clerk', 'security', 'receiving', 'read', 'write']
    const isAuth = (role: string): boolean => {
      return roles.includes(role);
    };

  //useWS()
  return (
    <>
      {loading ? (
        <Circles /> 
      ) : u.accessToken.length > 0  && isAuth(u.role) ? (
        renderRoutes()
      ) : (
        <Login />
      )}
    </>
  );
}

const renderRoutes = () => {
  return(
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/shifts' element={<Shifts />} />
          <Route path='/route' element={<RouteView />} />
          <Route path='/daily' element={<PlantView />} />
          <Route path='/shiftBuilder' element={<ScheduleBuilder />} />
          <Route path='/live' element={<LiveSheet />} />
          <Route path='/calendar' element={<Scheduler />} />
          <Route path='/io' element={<IO />} />
          <Route path='/hot' element={<HotParts />} />
          <Route path='/edock' element={<EDock />} />
          <Route path='/edockroughdraft' element={<EDockRoughDraft />} />
          <Route path='/exception' element={<ExLog />} />
          <Route path='/rail' element={<RailDrill />} />
          <Route path='/dy' element={<DyLog />} />
          <Route path='/nextShift' element={<NextShift />} />
          <Route path='/scan' element={<Scan />} />
          <Route path='/editUser' element={<EditUser />} />
          <Route path='/overview' element={<ShiftOverview />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App
