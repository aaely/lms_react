import { atom } from 'jotai'

/** /api/get_part_comments: a part's PDT and comment, kept across ASL uploads. */
export interface PartComment {
    part:      string
    pdt:       string
    comment:   string
    updatedBy: string
    updatedAt: string
}

/**
 * Part number -> its PDT and comment. Loaded by the Low DOH tab and kept current
 * by the `part_comment` websocket message, so a save on one screen shows on all.
 */
export const partComments = atom<Map<string, PartComment>>(new Map())

/** The map with `saved` applied: added or replaced, or dropped once both fields are blank. */
export const withComment = (prev: Map<string, PartComment>, saved: PartComment): Map<string, PartComment> => {
    const next = new Map(prev)
    if (saved.comment || saved.pdt) next.set(saved.part, saved)
    else next.delete(saved.part)
    return next
}
