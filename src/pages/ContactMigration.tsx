import { useState } from 'react'
import { useAtom } from 'jotai'
import Papa from 'papaparse'
import { user } from '../signals/signals'
import { api } from '../utils/api'
import Circles from './Loader'
import { FIELDS, check, toContact, type Parsed } from '../utils/contactFile'

/*
 * One-time load of Contact nodes dumped from another Neo4j instance, e.g.
 *
 *   MATCH (c:Contact)
 *   RETURN c.email AS email, c.name AS name, c.phone AS phone, c.duns AS duns, c.scac AS scac
 *
 * exported from Neo4j Browser as CSV or JSON. `RETURN c` exports and un-aliased
 * `c.email` headers are read too. Written by /api/import_contacts (mgo_backend
 * src/io_migration.rs); delete both with the other migrations.
 */

const th: React.CSSProperties = { padding: '6px 8px', borderBottom: '2px solid #333', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'white' }
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }

const ContactMigration = () => {
    const [u] = useAtom(user)
    const [loading, setLoading]   = useState(false)
    const [fileName, setFileName] = useState('')
    const [rows, setRows]         = useState<Parsed[] | null>(null)
    const [imported, setImported] = useState<number | null>(null)
    const [error, setError]       = useState('')

    const host = window.location.host

    if (u.role !== 'admin') {
        return <p style={{ margin: '5%' }}>Contact migration is admin only.</p>
    }

    const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return
        setImported(null)
        setError('')
        setRows(null)
        setFileName(file.name)

        const finish = (records: Record<string, unknown>[]) => {
            if (records.length === 0) { setError(`${file.name} has no records`); return }
            const contacts = records.map(toContact)
            if (contacts.every(c => !c.email && !c.duns && !c.scac)) {
                setError(`Couldn't find email, duns or scac in ${file.name}. Export the query in the note above as CSV or JSON.`)
                return
            }
            setRows(check(contacts))
        }

        if (file.name.toLowerCase().endsWith('.json')) {
            file.text().then(text => {
                try {
                    const json = JSON.parse(text)
                    finish(Array.isArray(json) ? json : [json])
                } catch (e: any) {
                    setError(`${file.name} isn't valid JSON: ${e?.message ?? e}`)
                }
            })
        } else {
            Papa.parse<Record<string, string>>(file, {
                header: true,
                skipEmptyLines: true,
                // DUNS keep their leading zeros as text; typing would drop them.
                dynamicTyping: false,
                transformHeader: h => h.replace(/^﻿/, '').trim(),
                complete: results => finish(results.data),
                error: err => setError(err.message),
            })
        }
    }

    const ready    = rows?.filter(r => r.problems.length === 0) ?? []
    const blocked  = rows?.filter(r => r.problems.length > 0) ?? []
    const noted    = ready.filter(r => r.warnings.length > 0)
    const carriers = ready.filter(r => r.contact.scac && r.contact.email).length

    const runImport = async () => {
        if (!window.confirm(
            `Import ${ready.length} contacts into ${host}?` +
            (blocked.length > 0 ? `\n\n${blocked.length} will be left out (listed on the page).` : '') +
            `\n\nContacts with the same email are updated; nothing is deleted.` +
            (carriers > 0 ? `\n\n${carriers} carrier contacts will start receiving Late Trailer emails from this environment.` : '')
        )) return

        setLoading(true)
        setError('')
        try {
            const res = await api.post<number>('/api/import_contacts', ready.map(r => r.contact))
            setImported(res.data)
        } catch (e: any) {
            setError(typeof e?.response?.data === 'string' && e.response.data ? e.response.data : (e?.message ?? 'Import failed'))
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Circles />

    const list = (items: Parsed[], key: 'problems' | 'warnings', color: string) => (
        <ul style={{ color, maxHeight: 200, overflow: 'auto' }}>
            {items.map(r => <li key={r.at}>#{r.at} ({r.contact.email || 'no email'}): {r[key].join('; ')}</li>)}
        </ul>
    )

    return (
        <div style={{ margin: '3% auto', width: '80vw' }}>
            <h3>Contact Migration</h3>
            <p style={{ color: '#888' }}>This environment: <strong>{host}</strong></p>
            <p style={{ color: '#888' }}>
                Export from the other instance's Neo4j Browser as CSV or JSON:
            </p>
            <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
{`MATCH (c:Contact)
RETURN c.email AS email, c.name AS name, c.phone AS phone, c.duns AS duns, c.scac AS scac`}
            </pre>
            <p style={{ color: '#d97706' }}>
                Load the file straight from the export. Opening and re-saving it in Excel drops
                leading zeros from DUNS.
            </p>

            <input id="contacts-file" type="file" accept=".csv, .json" onChange={loadFile} style={{ display: 'none' }} />
            <label htmlFor="contacts-file" className="btn btn-primary">Choose contacts file</label>
            {fileName && <span style={{ marginLeft: 12 }}>{fileName}</span>}

            {error && <p style={{ color: 'red', marginTop: '2%' }}>{error}</p>}

            {rows && (
                <>
                    <p style={{ marginTop: '2%' }}>
                        {rows.length} contacts found: <strong style={{ color: 'green' }}>{ready.length} ready</strong>
                        {blocked.length > 0 && <>, <strong style={{ color: 'red' }}>{blocked.length} with problems</strong></>}.
                    </p>
                    {carriers > 0 && (
                        <p style={{ color: '#d97706' }}>
                            {carriers} of these have a SCAC. Once imported, marking one of that carrier's trailers
                            Late on the live sheet emails them from {host}. Check the file has no test or
                            placeholder addresses.
                        </p>
                    )}
                    {blocked.length > 0 && <><h5>Left out</h5>{list(blocked, 'problems', 'red')}</>}
                    {noted.length > 0 && <><h5>Imported, but worth a look</h5>{list(noted, 'warnings', '#d97706')}</>}

                    {ready.length > 0 && (
                        <div style={{ maxHeight: '45vh', overflow: 'auto', marginTop: '1%' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr>
                                        <th style={th}>#</th>
                                        {FIELDS.map(f => <th key={f} style={th}>{f}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ready.map(r => (
                                        <tr key={r.at}>
                                            <td style={td}>{r.at}</td>
                                            {FIELDS.map(f => <td key={f} style={td}>{r.contact[f]}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <button onClick={runImport} className="btn btn-danger" style={{ marginTop: '2%' }} disabled={ready.length === 0}>
                        Import {ready.length} contacts into {host}
                    </button>
                </>
            )}

            {imported !== null && (
                <p style={{ color: 'green', marginTop: '2%' }}>
                    Imported {imported} contact{imported === 1 ? '' : 's'} successfully.
                </p>
            )}
        </div>
    )
}

export default ContactMigration
