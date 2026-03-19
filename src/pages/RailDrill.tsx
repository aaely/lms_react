import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { useAtom } from 'jotai'
import { step as s, skipped as sk, tab as t, railPart, railASN, stagedTrailers } from '../signals/signals'
import { Typography } from '@mui/material'
import RailGmap from './RailGmap'
import RailAsn from './RailASN'
import RailSchedule from './RailSchedule'
import RailRoughDraft from './RailRoughDraft'

const steps = ['ASL Input', 'ASN Input', 'Schedule Containers', 'Rail Rough Draft']

const getComponent = (tab: number) => {
    switch (tab) {
        case 0: {
            return <RailGmap />
        } case 1: {
            return <RailAsn />
        } case 2: {
            return <RailSchedule />
        } case 3: {
            return <RailRoughDraft />
        } default:
            break;
    }
}

const RailDrill = () => {
    const [step] = useAtom(s)
    const [skipped] = useAtom(sk)
    const [tab, setTab] = useAtom(t)
    const [parts, setParts] = useAtom(railPart);
    const [asns, setAsns] = useAtom(railASN);
    const [, setStaged] = useAtom(stagedTrailers)

    const resetStaged = () => {
        const updatedAsns = Object.fromEntries(
            Object.entries(asns).map(([trailer, entries]) => [
                trailer,
                entries.map(asn => ({ ...asn, isStaged: false }))
            ])
        )

        const updatedParts = { ...parts }
        for (const [, entries] of Object.entries(asns)) {
            if (entries[0]?.isStaged) {
                for (const asn of entries) {
                    if (updatedParts[asn.part]) {
                        const qty = parseFloat(asn.quantity as any)
                        const current = updatedParts[asn.part].adjCbal ?? updatedParts[asn.part].cbal
                        updatedParts[asn.part] = {
                            ...updatedParts[asn.part],
                            adjCbal: current - qty
                        }
                    }
                }
            }
        }

        setAsns(updatedAsns)
        setParts(updatedParts)
        setStaged({})
    }

    const isStepOptional = (st: number) => {
        if (!st) return
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
            <Stepper activeStep={tab} style={{ marginTop: '3%' }}>
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
            <div style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '90%',
                        justifyContent: 'space-evenly',
                        alignItems: 'center',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>     
                        <a href="/" style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', marginBottom: '3%'}} className="btn btn-info mb-3">Home</a>
                        <a onClick={() => resetStaged()} style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', marginBottom: '3%'}} className="btn btn-danger mb-3">Reset Staged Cars</a>
            </div>
            
            {getComponent(tab)}
        </div>
    )
}

export default RailDrill