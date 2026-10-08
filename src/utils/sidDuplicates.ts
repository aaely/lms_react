/*
 * SIDs listed on more than one IO trailer (IO Schedule's Duplicate SIDs view). A
 * consolidating warehouse moves SIDs from several containers onto one line haul,
 * and both trailers keep them until the old container is deleted — meanwhile its
 * parts count as inbound twice. Deleting a trailer only removes SIDs and parts no
 * other trailer still uses, so the line haul keeps the shared ones.
 */

export interface SidDuplicate {
    /** This trailer's SIDs that are also on another trailer */
    dupSids: Set<string>
    /**
     * Which side it probably is:
     *  - "All SIDs also on X": absorbed into X — usually the container to delete
     *  - "Shares SIDs with A, B": holds SIDs from elsewhere — usually the line haul
     *  - "Same SIDs as X": identical sets, e.g. a line haul built from one container
     */
    note:    string
    /** Sort key that puts trailers sharing SIDs next to each other */
    group:   string
}

const clean = (sids: unknown[] | undefined): string[] =>
    [...new Set((sids ?? []).map(s => String(s ?? '').trim()).filter(Boolean))]

export const findSidDuplicates = (io: { Trailer: string; Sids?: unknown[] }[]) => {
    const trailersBySid = new Map<string, Set<string>>()
    const sidsByTrailer = new Map<string, string[]>()
    for (const trl of io) {
        const sids = clean(trl.Sids)
        sidsByTrailer.set(trl.Trailer, sids)
        for (const sid of sids) {
            if (!trailersBySid.has(sid)) trailersBySid.set(sid, new Set())
            trailersBySid.get(sid)!.add(trl.Trailer)
        }
    }

    // Trailers linked through any shared SID form one group, so a line haul sorts
    // next to every container it absorbed, not just the one with its lowest SID.
    const parent = new Map<string, string>()
    const root = (t: string): string => {
        while (parent.get(t) !== t) { parent.set(t, parent.get(parent.get(t)!)!); t = parent.get(t)! }
        return t
    }
    for (const t of sidsByTrailer.keys()) parent.set(t, t)
    for (const trailers of trailersBySid.values()) {
        const [first, ...rest] = [...trailers]
        for (const t of rest) parent.set(root(t), root(first))
    }
    const groupKey = new Map<string, string>()   // root -> lowest shared SID in the group
    for (const [sid, trailers] of trailersBySid) {
        if (trailers.size < 2) continue
        const r = root([...trailers][0])
        if (!groupKey.has(r) || sid < groupKey.get(r)!) groupKey.set(r, sid)
    }

    const byTrailer = new Map<string, SidDuplicate>()
    for (const [trailer, sids] of sidsByTrailer) {
        const others = (sid: string) => [...trailersBySid.get(sid)!].filter(t => t !== trailer)
        const dupSids = new Set(sids.filter(sid => others(sid).length > 0))
        if (dupSids.size === 0) continue

        const sharers = [...new Set([...dupSids].flatMap(others))].sort()
        // Trailers holding every one of this trailer's SIDs
        const holdsAll = sharers.filter(t => sids.every(sid => trailersBySid.get(sid)!.has(t)))
        // ...and whose own SIDs are all on this one too: identical sets
        const sameSet = (t: string) => (sidsByTrailer.get(t) ?? []).every(sid => trailersBySid.get(sid)!.has(trailer))

        const note = holdsAll.length === 0
            ? `Shares SIDs with ${sharers.join(', ')}`
            : holdsAll.every(sameSet)
                ? `Same SIDs as ${holdsAll.join(', ')}`
                : `All SIDs also on ${holdsAll.join(', ')}`

        byTrailer.set(trailer, { dupSids, note, group: groupKey.get(root(trailer)) ?? [...dupSids].sort()[0] })
    }

    const dupSidCount = [...trailersBySid.values()].filter(t => t.size > 1).length
    return { byTrailer, dupSidCount }
}
