import Landing from './pages/Landing'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import { useEffect, useState } from 'react'
import { useAtom } from 'jotai';
import { trls as t, user } from './signals/signals';
//import  useWS from './utils/useWS'
import Shifts from './pages/Shifts';
import RouteView from './pages/Route';
import ShiftScheduleBuilder from './pages/ShiftScheduleBuilder';
import FinalVerification from './pages/FinalVerification';
import LiveSheet from './pages/LiveSheet';
import Papa from 'papaparse'
import NextShift from './pages/NextShift';
import Login from './pages/Login';
import PlantView from './pages/Trailers';
import Circles from './pages/Loader';
import ShiftOverview from './pages/ShiftOverview';

function App() {
  //const [t] = useAtom(token)
  const [, setTrls] = useAtom(t);
  const [u, setUser] = useAtom(user)
  const [loading, setLoading] = useState(true)
    useEffect(() => {
        fetch('/LMS.csv')
        .then(response => response.text())
        .then(text => {
        Papa.parse(text, {
                header: false,
                skipEmptyLines: true,
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
                        !stat2.includes('cancel') 
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

  //useWS()
  return (
    <>
      {loading ? (
        <Circles /> 
      ) : u.accessToken.length > 0 ? (
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
          <Route path='/shiftBuilder' element={<ShiftScheduleBuilder />} />
          <Route path='/final' element={<FinalVerification />} />
          <Route path='/live' element={<LiveSheet />} />
          <Route path='/nextShift' element={<NextShift />} />
          <Route path='/overview' element={<ShiftOverview />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App
