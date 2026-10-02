import { type PartASL } from '../signals/signals'
import { BALANCE_DAYS, dayLabel, fmtNum, type BalanceRows } from '../utils/ioBalance'

const balTh: React.CSSProperties = { padding: '2px 10px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }
const balTd: React.CSSProperties = { padding: '3px 10px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }

interface Props {
    asl:     PartASL
    balance: BalanceRows
    day1:    Date
    /**
     * Content for a day's In Transit cell, e.g. IO Schedule's editable what-if
     * quantities. Omitted, the cell just shows the scheduled inbound.
     */
    renderInbound?: (n: number, actual: number) => React.ReactNode
}

/**
 * 21-day running balance for one part: daily requirement, what scheduled IO
 * trailers bring in, and the projected end-of-day balance — red below zero,
 * magenta below bank.
 */
const BalanceTable = ({ asl, balance, day1, renderInbound }: Props) => {
    const days = Array.from({ length: BALANCE_DAYS }, (_, i) => i + 1)
    return (
        <div style={{ overflowX: 'auto', margin: '6px 0 10px' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, background: '#fff' }}>
                <thead>
                    <tr>
                        <th style={balTh}></th>
                        {days.map(n => <th key={n} style={balTh}>{dayLabel(day1, n)}</th>)}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ ...balTh, textAlign: 'left' }}>Req</td>
                        {days.map(n => (
                            <td key={n} style={{ ...balTd, color: '#6b7280' }}>{fmtNum((asl as any)[`day${n}`])}</td>
                        ))}
                    </tr>
                    <tr>
                        <td style={{ ...balTh, textAlign: 'left' }}>In Transit</td>
                        {days.map(n => {
                            const actual = balance.inbound[n - 1]
                            return renderInbound
                                ? <td key={n} style={{ ...balTd, padding: '2px 4px' }}>{renderInbound(n, actual)}</td>
                                : <td key={n} style={{ ...balTd, color: '#374151' }}>{fmtNum(actual)}</td>
                        })}
                    </tr>
                    <tr>
                        <td style={{ ...balTh, textAlign: 'left' }}>Proj Bal</td>
                        {days.map(n => {
                            const bal = balance.balances[n - 1]
                            const color = bal < 0 ? '#b91c1c' : bal < Number(asl.bank ?? 0) ? '#e707d8' : '#15803d'
                            return <td key={n} style={{ ...balTd, color }}>{fmtNum(bal)}</td>
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

export default BalanceTable
