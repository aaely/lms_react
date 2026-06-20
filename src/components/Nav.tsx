import { logout } from '../utils/api'

export default function Nav() {

    return (
        <div>
            <div style={{display: 'flex',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        zIndex: 1000,
                        justifyContent: 'space-around',
                        alignContent: 'center',
                        alignItems:'center',
                        justifyItems: 'center',
                        width: '100vw',
                        height: '7vh',
                        backgroundColor: '#333',
                        color: 'limegreen',
                        flexWrap: 'wrap'}}
                        >
                <div>
                    <a href="/" style={{color: 'limegreen', textDecoration: 'none'}}>Home</a>
                </div>
                <div>
                    <a href="/route" style={{color: 'limegreen', textDecoration: 'none'}}   >Search By Route</a>
                </div>
                <div>
                    <a href="/shiftBuilder" style={{color: 'limegreen', textDecoration: 'none'}}>Schedule Builder</a>
                </div>
                <div>
                    <a href="/live" style={{color: 'limegreen', textDecoration: 'none'}}>Schedule</a>
                </div>
                <div>
                    <a href="/exception" style={{color: 'limegreen', textDecoration: 'none'}}>Exception Log</a>
                </div>
                <div>
                    <a href="/dy" style={{color: 'limegreen', textDecoration: 'none'}}>DY Log</a>
                </div>
                <div>
                    <a href="/calendar" style={{color: 'limegreen', textDecoration: 'none'}}>Floater Calendar</a>
                </div>
                <div>
                    <a href="/hot" style={{color: 'limegreen', textDecoration: 'none'}}>Hot Parts</a>
                </div>
                <div>
                    <a href="/live" style={{color: 'limegreen', textDecoration: 'none'}}>Schedule</a>
                </div>
                <div>
                    <a href="/rail" style={{color: 'limegreen', textDecoration: 'none'}}>Rail Schedule</a>
                </div>
                <div>
                    <a href="/io" style={{color: 'limegreen', textDecoration: 'none'}}>IO Schedule</a>
                </div>
                <div>
                    <a href="/scan" style={{color: 'limegreen', textDecoration: 'none'}}>Scan</a>
                </div>
                <div>
                    <a href="/forecast" style={{color: 'limegreen', textDecoration: 'none'}}>Forecast</a>
                </div>
                <div>
                    <a href="/hot" style={{color: 'limegreen', textDecoration: 'none'}}>Hot Sheet</a>
                </div>
                <div>
                    <a href="/refresh" style={{color: 'limegreen', textDecoration: 'none'}}>Refresh MGO</a>
                </div>
                <div>
                    <a href="/live" style={{color: 'limegreen', textDecoration: 'none'}}>Forecast</a>
                </div>
                <div onClick={logout} style={{cursor: 'pointer'}}>
                    <a>Logout</a>
                </div>
            </div>
        </div>
    );
}