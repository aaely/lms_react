import { atom } from 'jotai'

/*
 * Route blackouts: delivery hours a route can't be delivered in, set on the Route
 * Blackouts page (mgo_backend src/route_blackouts.rs). Loaded at sign-in by
 * useLoadRouteBlackouts and refreshed over the websocket when an admin saves.
 * The Exception Log and DY Log keep deliveries out of these hours.
 */

/** The API shape: one row per restricted route. */
export interface RouteBlackout {
    route: string
    hours: number[]
}

/** route ID (uppercased) -> blacked-out delivery hours (0-23) */
export type RouteBlackouts = Map<string, Set<number>>

export const routeBlackouts = atom<RouteBlackouts>(new Map())

/** Routes match on the full route ID, ignoring case and stray spaces. */
export const routeKey = (route: string | undefined) => (route ?? '').trim().toUpperCase()

export const fromList = (list: RouteBlackout[]): RouteBlackouts =>
    new Map(list.map(b => [routeKey(b.route), new Set(b.hours)]))

export const toList = (blackouts: RouteBlackouts): RouteBlackout[] =>
    [...blackouts]
        .filter(([route, hours]) => route && hours.size > 0)
        .map(([route, hours]) => ({ route, hours: [...hours].sort((a, b) => a - b) }))

/** The hour of an 'HH:MM' delivery time; null when there's no time yet. */
export const deliveryHour = (time: string | undefined): number | null => {
    const h = parseInt((time ?? '').split(':')[0], 10)
    return Number.isInteger(h) && h >= 0 && h <= 23 ? h : null
}

/** The blacked-out hour a delivery lands in, or null when it's allowed. */
export const blackedOutHour = (blackouts: RouteBlackouts, route: string | undefined, time: string | undefined): number | null => {
    const hours = blackouts.get(routeKey(route))
    const hour = deliveryHour(time)
    return hours && hour !== null && hours.has(hour) ? hour : null
}

/** Same wording as the server's refusal. */
export const blackoutMessage = (route: string | undefined, hour: number) =>
    `Route ${routeKey(route)} can't be delivered at ${String(hour).padStart(2, '0')}:00 — that hour is blacked out for it`
