/*import { useEffect } from "react"
import { useAtom } from "jotai"
import { dyCommLogForm, user, type DyCommLogForm } from "../signals/signals"
//import { parse } from 'date-fns'
import TextField from '@mui/material/TextField'*/


const DyCommLog = () => {
/*    const [u, setU] = useAtom(user)
    const [form, setForm] = useAtom(dyCommLogForm)

    const handleChange = ({target: { id, value}}: any) => {
        switch (id) {
            case 'planStartTime': {
                let hour = value.split(':')[0]
                let mins = value.split(':')[1]
                setForm((prev: DyCommLogForm) => ({
                    ...prev,
                    [id]: value,
                    adjustedStartTime: value,
                    scheduleEndTime: hour > 23 ? '0' : `${parseInt(hour) + 1}:${mins}`,
                    hour
                }));
                break;
            }
            case 'adjustedStartTime': {
                let hour = value.split(':')[0]
                let mins = value.split(':')[1]
                setForm((prev: DyCommLogForm) => ({
                    ...prev,
                    [id]: value,
                    planStartTime: value,
                    scheduleEndTime: hour > 23 ? '0' : `${parseInt(hour) + 1}:${mins}`,
                    hour
                }));
                break;
            }
            default: {
                setForm((prev: DyCommLogForm) => ({
                    ...prev,
                    [id]: value
                }));
                break;
            }
        }
    }

*/

}

export default DyCommLog