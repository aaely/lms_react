import { atom } from 'jotai'
import { DEFAULT_DOCK_GRID } from './dockGrid'

/*
 * Dock capacity, configured on the Dock Capacity page and stored in the database
 * (mgo_backend src/dock_capacity.rs). Loaded once at sign-in by
 * useLoadDockCapacity; until an admin first saves, the built-in values below
 * apply, so a fresh environment behaves as it always did.
 */

export const SHIFTS = ['1st', '2nd', '3rd'] as const

// Built-in trailers per dock per shift: the plant's values before they became
// configurable. D and P have no limit.
export const DEFAULT_SHIFT_CAPACITY = new Map<string, Record<string, number>>([
    ['1st', { BE: 17, BN: 6, E: 8, F: 8, F1: 8, A: 1, U: 54, V: 39, BW: 6 }],
    ['2nd', { BE: 16, BN: 5, E: 8, F: 8, F1: 8, A: 2, U: 55, V: 38, BW: 6 }],
    ['3rd', { BE: 16, BN: 6, E: 8, F: 8, F1: 8, A: 1, U: 57, V: 37, BW: 6 }],
])

export interface DockCapacity {
    /** dock -> hour (0-23) -> trailers that hour */
    grid:   Map<string, Map<number, number>>
    /** shift ('1st' | '2nd' | '3rd') -> dock -> trailers that shift */
    shift:  Map<string, Record<string, number>>
    /** 'defaults' until an admin has saved a configuration */
    source: 'defaults' | 'database'
}

export const BUILT_IN_DOCK_CAPACITY: DockCapacity = {
    grid:   DEFAULT_DOCK_GRID,
    shift:  DEFAULT_SHIFT_CAPACITY,
    source: 'defaults',
}

export const dockCapacity = atom<DockCapacity>(BUILT_IN_DOCK_CAPACITY)

/** The /api/get_dock_capacity and /api/set_dock_capacity shape: one row per value. */
export interface DockCapacityRows {
    hourly: { dock: string; hour: number; capacity: number }[]
    shift:  { shift: string; dock: string; capacity: number }[]
}

/** null when nothing has been saved yet — keep the built-in values then. */
export const fromRows = (rows: DockCapacityRows): DockCapacity | null => {
    if (rows.hourly.length === 0 && rows.shift.length === 0) return null

    const grid = new Map<string, Map<number, number>>()
    for (const { dock, hour, capacity } of rows.hourly) {
        if (!grid.has(dock)) grid.set(dock, new Map())
        grid.get(dock)!.set(hour, capacity)
    }

    // Every shift present, so a lookup for a shift with no docks gives {} rather
    // than undefined.
    const shift = new Map<string, Record<string, number>>(SHIFTS.map(s => [s, {}]))
    for (const { shift: name, dock, capacity } of rows.shift) {
        if (!shift.has(name)) shift.set(name, {})
        shift.get(name)![dock] = capacity
    }

    return { grid, shift, source: 'database' }
}

export const toRows = (c: Pick<DockCapacity, 'grid' | 'shift'>): DockCapacityRows => ({
    hourly: [...c.grid].flatMap(([dock, hours]) =>
        [...hours].map(([hour, capacity]) => ({ dock, hour, capacity }))),
    shift: [...c.shift].flatMap(([shift, docks]) =>
        Object.entries(docks).map(([dock, capacity]) => ({ shift, dock, capacity }))),
})
