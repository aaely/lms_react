/*import { useEffect } from "react"
import { useAtom } from "jotai"
import { exceptionLogForm, user, type ExceptionLogForm } from "../signals/signals"
//import { parse } from 'date-fns'
import TextField from '@mui/material/TextField'
*/

const ExceptionLog = () => {
/*    const [u, setU] = useAtom(user)
    const [form, setForm] = useAtom(exceptionLogForm)

    const handleChange = ({target: { id, value}}: any) => {
        switch (id) {
            case 'planStartTime': {
                let hour = value.split(':')[0]
                let mins = value.split(':')[1]
                setForm((prev: ExceptionLogForm) => ({
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
                setForm((prev: ExceptionLogForm) => ({
                    ...prev,
                    [id]: value,
                    planStartTime: value,
                    scheduleEndTime: hour > 23 ? '0' : `${parseInt(hour) + 1}:${mins}`,
                    hour
                }));
                break;
            }
            default: {
                setForm((prev: ExceptionLogForm) => ({
                    ...prev,
                    [id]: value
                }));
                break;
            }
        }
    }

*/    

}

export default ExceptionLog