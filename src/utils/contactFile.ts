/*
 * Reading a Contact dump exported from another Neo4j instance's Browser, for the
 * one-time load in pages/ContactMigration.tsx. Accepts CSV or JSON, with aliased
 * columns ({email, ...}), un-aliased ones ({"c.email", ...}), or whole nodes
 * ({c: {...}} / {c: {properties: {...}}}, or a CSV column holding the node's JSON).
 */

export interface Contact {
    email: string
    name:  string
    phone: string
    duns:  string
    scac:  string
}

export interface Parsed {
    contact:  Contact
    /** 1-based position in the file, for pointing back at it. */
    at:       number
    problems: string[]
    warnings: string[]
}

export const FIELDS: (keyof Contact)[] = ['email', 'name', 'phone', 'duns', 'scac']

// Neo4j writes missing properties as null (JSON) or the text "null" (CSV).
const clean = (v: unknown): string =>
    v === null || v === undefined || v === 'null' ? '' : String(v).trim()

/**
 * Pulls a contact out of one exported record, whatever shape the export took:
 * aliased columns ({email, ...}), un-aliased ({"c.email", ...}), or the whole
 * node ({c: {...}} / {c: {properties: {...}}}, or a CSV column holding its JSON).
 */
export const toContact = (record: Record<string, unknown>): Contact => {
    let props: Record<string, unknown> = record
    const node = record.c ?? record.n
    if (node !== undefined) {
        const obj = typeof node === 'string' ? (() => { try { return JSON.parse(node) } catch { return {} } })() : node
        props = (obj as any)?.properties ?? obj ?? {}
    }
    const get = (f: keyof Contact) => clean(props[f] ?? props[`c.${f}`] ?? props[`n.${f}`])
    return { email: get('email'), name: get('name'), phone: get('phone'), duns: get('duns'), scac: get('scac') }
}

export const check = (contacts: Contact[]): Parsed[] => {
    const rows: Parsed[] = contacts.map((contact, i) => ({ contact, at: i + 1, problems: [], warnings: [] }))

    for (const r of rows) {
        const c = r.contact
        // update_contact's own rules
        if (!c.email) r.problems.push('No email: contacts are identified by email')
        if (!c.duns && !c.scac) r.problems.push('Needs a DUNS or a SCAC')
        if (/e\+/i.test(c.duns)) r.problems.push(`DUNS "${c.duns}" looks like Excel scientific notation`)
        if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) r.warnings.push(`"${c.email}" doesn't look like an email address`)
        if (/^\d+$/.test(c.duns) && c.duns.length < 9) r.warnings.push(`DUNS "${c.duns}" is under 9 digits; leading zeros may have been lost`)
    }

    // Matched on the exact email, so one written twice would be written twice
    // with the later winning, and a case variant would become a second contact.
    const byEmail = new Map<string, Parsed[]>()
    for (const r of rows.filter(r => r.contact.email)) {
        const key = r.contact.email.toLowerCase()
        byEmail.set(key, [...(byEmail.get(key) ?? []), r])
    }
    for (const group of byEmail.values()) {
        if (group.length < 2) continue
        for (const r of group) {
            const others = group.filter(g => g !== r).map(g => `#${g.at}`).join(', ')
            const exact = group.some(g => g !== r && g.contact.email === r.contact.email)
            r.problems.push(exact
                ? `Same email as ${others}: only one can be kept, so remove the other from the file`
                : `Same email as ${others} apart from capitals: these would become separate contacts`)
        }
    }
    return rows
}
