import '../App.css';
import RadialBarChart from './RadialBarChart';

const Forecast = () => {
    
    return(
        <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly'}}>
            <RadialBarChart />
        </div>
    )
}

export default Forecast