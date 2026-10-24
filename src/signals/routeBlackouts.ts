import { atom } from 'jotai'

/*
 * Route blackouts: 15-minute windows a route can't be delivered in, set on the
 * Route Blackouts page (mgo_backend src/route_blackouts.rs). Loaded at sign-in by
 * useLoadRouteBlackouts and refreshed over the websocket when an admin saves.
 * The Exception Log and DY Log keep deliveries out of these windows.
 *
 * A window is named by its start minute of the day: 870 is 14:30–14:45.
 */

/** Minutes in a blackout window. */
export const SLOT_MINUTES = 15

/** The windows that make up an hour, as start minutes. */
export const hourSlots = (hour: number): number[] =>
    Array.from({ length: 60 / SLOT_MINUTES }, (_, q) => hour * 60 + q * SLOT_MINUTES)

/** 'HH:MM' for a window's start minute. */
export const slotLabel = (slot: number): string =>
    `${String(Math.floor(slot / 60)).padStart(2, '0')}:${String(slot % 60).padStart(2, '0')}`

/** 'HH:MM–HH:MM' for a whole window. */
export const slotRange = (slot: number): string =>
    `${slotLabel(slot)}–${slotLabel((slot + SLOT_MINUTES) % (24 * 60))}`

/** The API shape: one row per restricted route. */
export interface RouteBlackout {
    route: string
    slots: number[]
}

/** route ID (uppercased) -> blacked-out window start minutes */
export type RouteBlackouts = Map<string, Set<number>>

export const routeBlackouts = atom<RouteBlackouts>(new Map())

/** Routes match on the full route ID, ignoring case and stray spaces. */
export const routeKey = (route: string | undefined) => (route ?? '').trim().toUpperCase()

export const fromList = (list: RouteBlackout[]): RouteBlackouts =>
    new Map(list.map(b => [routeKey(b.route), new Set(b.slots ?? [])]))

export const toList = (blackouts: RouteBlackouts): RouteBlackout[] =>
    [...blackouts]
        .filter(([route, slots]) => route && slots.size > 0)
        .map(([route, slots]) => ({ route, slots: [...slots].sort((a, b) => a - b) }))

/**
 * The window an 'HH:MM' delivery time falls in ("14:37" -> 870); null when
 * there's no usable time yet. Same rules as the server's delivery_slot.
 */
export const deliverySlot = (time: string | undefined): number | null => {
    const [hh, mm] = (time ?? '').trim().split(':')
    const h = parseInt(hh, 10)
    if (!/^\s*\d+\s*$/.test(hh ?? '') || !Number.isInteger(h) || h < 0 || h > 23) return null
    const m = mm === undefined ? 0 : parseInt(mm.trim().slice(0, 2), 10)
    if (!Number.isInteger(m) || m < 0 || m > 59) return null
    return h * 60 + Math.floor(m / SLOT_MINUTES) * SLOT_MINUTES
}

/** The blacked-out window a delivery lands in, or null when it's allowed. */
export const blackedOutSlot = (blackouts: RouteBlackouts, route: string | undefined, time: string | undefined): number | null => {
    const slots = blackouts.get(routeKey(route))
    const slot = deliverySlot(time)
    return slots && slot !== null && slots.has(slot) ? slot : null
}

/** Every window of the hour is blacked out, so no time in it works. */
export const wholeHourBlackedOut = (slots: Set<number> | undefined, hour: number): boolean =>
    !!slots && hourSlots(hour).every(s => slots.has(s))

/** Some, but not all, of the hour's windows are blacked out. */
export const partHourBlackedOut = (slots: Set<number> | undefined, hour: number): boolean =>
    !!slots && hourSlots(hour).some(s => slots.has(s)) && !wholeHourBlackedOut(slots, hour)

/** Same wording as the server's refusal. */
export const blackoutMessage = (route: string | undefined, slot: number) =>
    `Route ${routeKey(route)} can't be delivered at ${slotRange(slot)} — that window is blacked out for it`
