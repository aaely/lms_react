import Landing from './pages/Landing'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import  useWS from './utils/useWS'
import Shifts from './pages/Shifts';
import RouteView from './pages/Route';
import RadialBarChart from './pages/RadialBarChart';
import ShiftScheduleBuilder from './pages/ShiftScheduleBuilder';
import FinalVerification from './pages/FinalVerification';
//import { token } from './signals/signals';
//import Login from './pages/Login';
//import { useAtom } from 'jotai';

function App() {
  //const [t] = useAtom(token)
  useWS()
  return (
    <>
      { renderRoutes()  }
    </>
  )
}

const renderRoutes = () => {
  return(
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/shifts' element={<Shifts />} />
          <Route path='/route' element={<RouteView />} />
          <Route path='/charts' element={<RadialBarChart />} />
          <Route path='/shiftBuilder' element={<ShiftScheduleBuilder />} />
          <Route path='/final' element={<FinalVerification />} />
        </Routes>
      </BrowserRouter>
  )
}

export default App
