import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { tab as t, railPart, railASN, stagedTrailers, type RailASL, type RailASN } from '../signals/signals'
import { api } from '../utils/api'
import { normalizeRailDock } from '../utils/helpers'
import Circles from './Loader'
import RailSchedule from './RailSchedule'
import RailRoughDraft from './RailRoughDraft'

const steps = ['Schedule Containers', 'Rail Rough Draft']

const DAY_KEYS = [
    'day1',  'day2',  'day3',  'day4',  'day5',  'day6',  'day7',
    'day8',  'day9',  'day10', 'day11', 'day12', 'day13', 'day14',
    'day15', 'day16', 'day17', 'day18', 'day19', 'day20', 'day21',
] as const

const getComponent = (tab: number) => {
    switch (tab) {
        case 1:  return <RailRoughDraft />
        default: return <RailSchedule />
    }
}

const RailDrill = () => {
    // tab is shared with the other steppers, so clamp a leftover index into range
    const [tab, setTab] = useAtom(t)
    const activeTab = tab >= 0 && tab < steps.length ? tab : 0
    const [parts, setParts] = useAtom(railPart)
    const [asns, setAsns] = useAtom(railASN)
    const [staged, setStaged] = useAtom(stagedTrailers)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const loadData = async () => {
        setLoading(true)
        setError('')
        try {
            const [aslRes, asnRes] = await Promise.all([
                api.get<RailASL[]>('/api/get_rail_asl'),
                api.get<RailASN[]>('/api/get_rail_asn'),
            ])

            // ── Parts: one per part number, lowest DoH wins; missing reqs count as 0 ──
            const partMap: Record<string, RailASL> = {}
            for (const p of aslRes.data) {
                const existing = partMap[p.part]
                if (existing && existing.doh <= p.doh) continue
                const part = { ...p, adjDoH: null } as RailASL
                for (const key of DAY_KEYS) part[key] = p[key] ?? 0
                partMap[p.part] = part
            }

            // ── ASNs: group by trailer. Status 5 is already received, so it goes
            //    straight into adjCbal and never shows up as a stageable trailer ──
            const asnMap: Record<string, RailASN[]> = {}
            for (const a of asnRes.data) {
                const asn: RailASN = { ...a, dock: normalizeRailDock(a.dock), isStaged: false }
                if (Number(asn.status) === 5) {
                    const part = partMap[asn.part]
                    if (part) part.adjCbal = (part.adjCbal ?? part.cbal) + Number(asn.quantity)
                    continue
                }
                ;(asnMap[asn.trailer] ??= []).push(asn)
            }

            setParts(partMap)
            setAsns(asnMap)
            setStaged({})
        } catch (err) {
            console.error('Failed to load rail data:', err)
            setError('Failed to load rail data from the server.')
        } finally {
            setLoading(false)
        }
    }

    // Staging persists in storage, so only auto-load when there's nothing to preserve
    useEffect(() => {
        if (Object.keys(parts).length === 0) loadData()
    }, [])

    const refreshData = () => {
        const stagedCount = Object.keys(staged).length
        if (stagedCount > 0 && !window.confirm(`Refreshing clears ${stagedCount} staged car${stagedCount !== 1 ? 's' : ''}. Continue?`)) {
            return
        }
        loadData()
    }

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

    return (
        <div style={{
            height: '100%',
            width: '100%',
            flexDirection: 'column',
            display: 'flex'
        }}>
            <Stepper activeStep={activeTab} style={{ marginTop: '3%' }}>
                {steps.map((label, index) => (
                    <Step key={label} onClick={() => setTab(index)}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
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
                        <a onClick={() => refreshData()} style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', marginBottom: '3%'}} className="btn btn-secondary mb-3">Refresh Data</a>
                        <a onClick={() => resetStaged()} style={{marginLeft: 'auto', marginRight: 'auto', marginTop: '3%', marginBottom: '3%'}} className="btn btn-danger mb-3">Reset Staged Cars</a>
            </div>

            {error && <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>}
            {loading ? <Circles /> : getComponent(activeTab)}
        </div>
    )
}

export default RailDrill
