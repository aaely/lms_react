import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { useAtom } from 'jotai'
import { step as s, skipped as sk, tab as t } from '../signals/signals'
import { Typography } from '@mui/material'
import DockSplits from './DockSplits'
import FinalVerification from './FinalVerification'
import Rescheduled from './Rescheduled'
import GMAP from './GMAP'

const steps = ['GMAP Input', 'Schedule Building', 'Reschedule Review', 'Finalize Schedule']

const getComponent = (tab: number) => {
    switch(tab) {
        case 0: {
            return <GMAP />
    }   case 1: {
            return <DockSplits />
    }   case 2: {
            return <Rescheduled />
    }   case 3: {
            return <FinalVerification />
    }   default: break;
    }
}

const ScheduleBuilder = () => {
    const [step] = useAtom(s)
    const [skipped] = useAtom(sk)
    const [tab, setTab] = useAtom(t)

    const isStepOptional = (st: number) => {
        console.log(st)
        return step === 2
    }

    const isStepSkipped = (step: number) => {
        return skipped.has(step)
    }

    /*const handleNext = () => {
        let newSkipped = skipped
        if (isStepSkipped(tab)) {
            newSkipped = new Set(newSkipped.values())
            newSkipped.delete(tab)
        }
    }

    const handleBack = () => {
        setTab((prevActiveStep) => prevActiveStep - 1)
    }

    const handleSkip = () => {
        if (!isStepOptional(tab)) {
            throw new Error("Not optional")
        }
        setTab((prevActiveStep => prevActiveStep + 1))
        setSkipped((prevSkipped: Set<number>) => {
            const newSkipped = new Set(prevSkipped.values())
            newSkipped.add(tab)
            return newSkipped
        })
    }

    const handleReset = () => {
        setTab(0)
    }*/

    return (
        <div style={{
            height: '100%',
            width: '100%',
            flexDirection: 'column',
            display: 'flex'
        }}>
            <Stepper activeStep={tab} style={{marginTop: '3%'}}>
                {steps.map((label, index) => {
                    const stepProps: any = {};
                    const labelProps: any = {};
                    if (isStepOptional(index)) {
                        labelProps.optional = (
                        <Typography variant="caption">Optional</Typography>
                        );
                    }
                    if (isStepSkipped(index)) {
                        stepProps.completed = false;
                    }
                    return (
                        <Step key={label} onClick={() => setTab(index)} {...stepProps}>
                        <StepLabel {...labelProps}>{label}</StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            {getComponent(tab)}
        </div>
    )
}

export default ScheduleBuilder