import Landing from './pages/Landing'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import { useEffect, useState } from 'react'
import { useAtom } from 'jotai';
import { user } from './signals/signals';
import { api } from './utils/api';
import  useWS from './utils/useWS'
import Shifts from './pages/Shifts';
import RouteView from './pages/Route';
import LiveSheet from './pages/LiveSheet';
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
import HotPartTable from './pages/HotPartTable';
import Scheduler from './pages/Users';
import EditUser from './pages/EditUser';
import Scan from './pages/Scan';
import EDock from './pages/eDock';
import PastShifts from './pages/PastShifts';
import Nav from './components/Nav';
import Forecast from './pages/Forecast';
import RefreshData from './pages/RefreshData';
import AuditEvents from './pages/AuditEvents';
import UploadLMS from './pages/UploadLMS';
import UploadPartRoute from './pages/UploadPartRoute';
import ManageContacts from './pages/ManageContacts';

function App() {
  //const [t] = useAtom(token)
  const [u, setUser] = useAtom(user)
  const [loading, setLoading] = useState(true)

  useWS()

  useEffect(() => {
    api.post('/api/sso_login')
      .then(res => setUser({ email: res.data.user.username, role: res.data.user.role }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []);


  const roles = ['mfu', 'admin', 'supervisor', 'clerk-vaa', 'clerk-univ', 'security', 'receiving', 'clerk_vaa', 'clerk_univ'];
  const isAuth = (role: string): boolean => {
    return roles.includes(role);
  };

  return (
    <>
      {loading ? (
        <Circles />
      ) : u.email.length > 0 && isAuth(u.role) ? (
        <>
          <Nav />
          <div style={{ paddingTop: '7vh' }}>
            {renderRoutes()}
          </div>
        </>
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
          <Route path='/hot' element={<HotPartTable />} />
          <Route path='/audit' element={<AuditEvents />} />
          <Route path='/edock' element={<EDock />} />
          <Route path='/past' element={<PastShifts />} />
          <Route path='/exception' element={<ExLog />} />
          <Route path='/rail' element={<RailDrill />} />
          <Route path='/dy' element={<DyLog />} />
          <Route path='/nextShift' element={<NextShift />} />
          <Route path='/scan' element={<Scan />} />
          <Route path='/forecast' element={<Forecast />} />
          <Route path='/refreshData' element={<RefreshData />} />
          <Route path='/editUser' element={<EditUser />} />
          <Route path='/overview' element={<ShiftOverview />} />
          <Route path='/uploadLMS' element={<UploadLMS />} />
          <Route path='/uploadPartRoute' element={<UploadPartRoute />} />
          <Route path='/manageContacts' element={<ManageContacts />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App
