import { useRef, useState } from 'react'
import { api } from './api'

/** /api/get_first_supplier — blank fields when the route has no part with a DOH. */
export interface FirstSupplier {
    supplier: string
    part:     string
    doh:      number | null
}

/**
 * First Supplier for a load: the supplier of its route's lowest-DOH part.
 *
 * `apply` writes the supplier into whichever form field the page uses. Call
 * `lookup(route)` when a load is picked — clear the field in the same update, so
 * a supplier from the previous load can't ride along when the new route has no
 * DOH data. An answer for a load the user has since moved off is dropped.
 */
const useFirstSupplier = (apply: (supplier: string) => void) => {
    const [source, setSource] = useState<FirstSupplier | null>(null)
    const req = useRef(0)
    const applyRef = useRef(apply)
    applyRef.current = apply

    const lookup = async (route: string) => {
        const id = ++req.current
        setSource(null)
        if (!route) return
        try {
            const res = await api.get<FirstSupplier>('/api/get_first_supplier', { params: { route } })
            if (id !== req.current || !res.data?.supplier) return
            applyRef.current(res.data.supplier)
            setSource(res.data)
        } catch (error) {
            console.log(error)
        }
    }

    /**
     * Helper text naming the part the supplier came from — only while the field
     * still holds the looked-up value, since after a manual edit it would name
     * the wrong part.
     */
    const note = (current: string | undefined): string | undefined =>
        source && current === source.supplier
            ? `Lowest DOH: ${source.part}${source.doh != null ? ` (${source.doh.toFixed(1)})` : ''}`
            : undefined

    return { lookup, note }
}

export default useFirstSupplier
