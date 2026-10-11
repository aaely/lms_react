import { useEffect, useRef, useState } from "react"
import { type LMSRecord } from "../signals/signals"
import { api } from "./api"

/**
 * LMS loads matching what's typed in an add-on's load and route fields, looked
 * up 300 ms after typing stops from 2 characters on. Call `picked` with the
 * chosen load: it closes both lists and keeps them closed while the fields
 * hold the values the pick filled in.
 */
const useLmsSuggestions = (loadNo: string, route: string) => {
    const [byLoad, setByLoad] = useState<LMSRecord[]>([])
    const [byRoute, setByRoute] = useState<LMSRecord[]>([])
    const last = useRef<LMSRecord | null>(null)

    useEffect(() => {
        if (!loadNo || loadNo.length < 2 || last.current?.load_no === loadNo) {
            setByLoad([])
            return
        }
        const timeout = setTimeout(async () => {
            try {
                const res = await api.get('/api/get_lms_by_load', { params: { load_no: loadNo } })
                setByLoad(res.data)
            } catch (error) {
                console.log(error)
            }
        }, 300)
        return () => clearTimeout(timeout)
    }, [loadNo])

    useEffect(() => {
        if (!route || route.length < 2 || last.current?.route_id === route) {
            setByRoute([])
            return
        }
        const timeout = setTimeout(async () => {
            try {
                const res = await api.get('/api/get_lms_route_suggestions', { params: { route } })
                setByRoute(res.data)
            } catch (error) {
                console.log(error)
            }
        }, 300)
        return () => clearTimeout(timeout)
    }, [route])

    const picked = (record: LMSRecord) => {
        last.current = record
        setByLoad([])
        setByRoute([])
    }

    return { byLoad, byRoute, picked }
}

export default useLmsSuggestions
