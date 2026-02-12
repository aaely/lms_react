import { useAtom } from 'jotai/react';
import { editMode as ed } from '../signals/signals';
import DockSplits from './DockSplits';
import EditTrailer from './EditTrailer'

const ShiftScheduleBuilder = () => {
    const [editMode] = useAtom(ed);
    console.log(editMode)
    
    return (
        <>
            {
                editMode ? <EditTrailer /> : <DockSplits />
            }
        </>
        
    )
}

export default ShiftScheduleBuilder