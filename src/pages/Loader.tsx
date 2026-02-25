import { CircleLoader } from 'react-spinners';

const Circles = () => {
    return (
    <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 'auto',
        marginRight: 'auto'
    }}>
    <CircleLoader 
    color="green"
    size = {200}
    />
    </div>
    );
}

export default Circles;