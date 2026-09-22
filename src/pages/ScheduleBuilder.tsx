import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { step as s, skipped as sk, tab as t, scheduleRange, type ScheduleRange,
    ws as wsAtom, user as userAtom, allTrls as allTrlsAtom, rescheduled as rescheduledAtom } from '../signals/signals'
import { Typography, TextField, Button, Box, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, Snackbar, Alert } from '@mui/material'
import { CLIENT_ID, parseScheduleBroadcast, sendScheduleBroadcast, type SchedulePayload } from '../utils/scheduleBroadcast'
import DockSplits from './DockSplits'
import FinalVerification from './FinalVerification'
import Rescheduled from './Rescheduled'
import LMS from './LMS'
import Ascent from './Ascent'
import GetDY from './GetDY'
import GetException from './GetException'

const steps = ['LMS Report Input', 'Ascent Report Intput', 'DY Entries', 'Exception Entries', 'Schedule Building', 'Reschedule Review', 'Finalize Schedule']

const getComponent = (tab: number) => {
    switch(tab) {
        case 0: {
            return <LMS />
    }   case 1: {
            return <Ascent />
    }   case 2: {
            return <GetDY />
    }   case 3: {
            return <GetException />
    }   case 4: {
            return <DockSplits />
    }   case 5: {
            return <Rescheduled />
    }   case 6: {
            return <FinalVerification />
    }   default: break;
    }
}

const ScheduleBuilder = () => {
    const [step] = useAtom(s)
    const [skipped] = useAtom(sk)
    const [tab, setTab] = useAtom(t)
    const [range, setRange] = useAtom(scheduleRange)
    const [socket] = useAtom(wsAtom)
    const [currentUser] = useAtom(userAtom)
    const [allTrls, setAllTrls] = useAtom(allTrlsAtom)
    const [rsch, setRsch] = useAtom(rescheduledAtom)

    // Incoming broadcast waits for the recipient to accept — applying it replaces
    // whatever they have built locally, which the atoms also persist.
    const [incoming, setIncoming] = useState<SchedulePayload | null>(null)
    const [toast, setToast] = useState<{ severity: 'success' | 'error' | 'info', text: string } | null>(null)

    const today = new Date().toLocaleDateString('en-CA')

    // Only this page listens, so a broadcast reaches exactly the users building a
    // schedule. addEventListener rather than onmessage, which useWS owns.
    useEffect(() => {
        if (!(socket instanceof WebSocket)) return

        const handler = ({ data }: MessageEvent) => {
            const payload = parseScheduleBroadcast(data)
            if (payload) setIncoming(payload)
        }

        socket.addEventListener('message', handler)
        return () => socket.removeEventListener('message', handler)
    }, [socket])

    const broadcast = () => {
        try {
            sendScheduleBroadcast(socket, {
                senderId:    CLIENT_ID,
                sentBy:      currentUser.email || 'Unknown user',
                sentAt:      new Date().toISOString(),
                tab,
                range,
                allTrls,
                rescheduled: rsch,
            })
            setToast({ severity: 'success', text: `Schedule sent to connected users (${allTrls.length} loads)` })
        } catch (error) {
            console.error('Schedule broadcast failed:', error)
            setToast({ severity: 'error', text: 'Not connected — schedule was not sent' })
        }
    }

    const applyIncoming = () => {
        if (!incoming) return
        setAllTrls(incoming.allTrls)
        setRsch(incoming.rescheduled)
        setRange(incoming.range)
        setTab(incoming.tab)
        setToast({ severity: 'info', text: `Applied schedule from ${incoming.sentBy}` })
        setIncoming(null)
    }

    const handleRangeChange = (field: keyof ScheduleRange) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setRange((prev) => ({ ...(prev ?? { startDate: today, startTime: '06:00', endDate: today, endTime: '13:59' }), [field]: e.target.value }))
    }

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
            {tab <= 3 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', px: 2, pt: 2, pb: 1, background: range ? '#eff6ff' : 'transparent', borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: range ? '#1d4ed8' : '#6b7280', minWidth: 120 }}>
                        {range ? 'Range Override Active' : 'Range Override'}
                    </Typography>
                    <TextField size="small" type="date" label="Start Date" InputLabelProps={{ shrink: true }}
                        value={range?.startDate ?? ''}
                        onChange={handleRangeChange('startDate')} />
                    <TextField size="small" type="time" label="Start Time" InputLabelProps={{ shrink: true }}
                        value={range?.startTime ?? ''}
                        onChange={handleRangeChange('startTime')} />
                    <TextField size="small" type="date" label="End Date" InputLabelProps={{ shrink: true }}
                        value={range?.endDate ?? ''}
                        onChange={handleRangeChange('endDate')} />
                    <TextField size="small" type="time" label="End Time" InputLabelProps={{ shrink: true }}
                        value={range?.endTime ?? ''}
                        onChange={handleRangeChange('endTime')} />
                    {range && (
                        <Button size="small" variant="outlined" color="warning" onClick={() => setRange(null)}>
                            Clear
                        </Button>
                    )}
                </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5, px: 2, pt: 1 }}>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {allTrls.length} load{allTrls.length === 1 ? '' : 's'}
                    {rsch.length > 0 && ` · ${rsch.length} rescheduled`}
                </Typography>
                <Button size="small" variant="contained" onClick={broadcast}
                    disabled={!(socket instanceof WebSocket) || socket.readyState !== WebSocket.OPEN || allTrls.length === 0}>
                    Broadcast Schedule
                </Button>
            </Box>

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

            <Dialog open={incoming !== null} onClose={() => setIncoming(null)}>
                <DialogTitle>Schedule broadcast received</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {incoming?.sentBy} sent a schedule with {incoming?.allTrls.length ?? 0} load
                        {incoming?.allTrls.length === 1 ? '' : 's'}
                        {incoming && incoming.rescheduled.length > 0 && ` and ${incoming.rescheduled.length} rescheduled`}.
                        Applying it replaces the schedule you have built on this page.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIncoming(null)}>Dismiss</Button>
                    <Button variant="contained" onClick={applyIncoming}>Apply</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)} variant="filled">
                    {toast?.text}
                </Alert>
            </Snackbar>
        </div>
    )
}

export default ScheduleBuilder