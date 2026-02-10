import Landing from './pages/Landing'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css'
import Shifts from './pages/Shifts';
import RouteView from './pages/Route';
import RadialBarChart from './pages/RadialBarChart';

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/shifts' element={<Shifts />} />
          <Route path='/route' element={<RouteView />} />
          <Route path='/charts' element={<RadialBarChart />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
