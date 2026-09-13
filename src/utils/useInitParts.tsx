import { useEffect } from "react";
import { routeDuns, lowestDoh } from "../signals/signals";
import { useAtom } from "jotai";
import { api } from "./api";

const useInitParts = () => {
    const [parts, setParts] = useAtom(routeDuns);
    const [, setLowestDoh] = useAtom(lowestDoh);

    useEffect(() => {
        if (parts.size > 0) return;
        api.get('/api/get_part_routes')
            .then(res => {
                const newMap = new Map<string, string[]>();
                const dohRecord: Record<string, number> = {};
                res.data.forEach(({ part, route, doh }: { part: string; route: string; doh?: number }) => {
                    const key = route.slice(0, 6);
                    if (!newMap.has(key)) newMap.set(key, []);
                    newMap.get(key)!.push(part);
                    if (doh != null) dohRecord[part] = doh;
                });
                setParts(newMap);
                setLowestDoh(dohRecord);
            })
            .catch(error => console.error('Error loading part routes:', error));
    }, [parts.size]);
};

export default useInitParts;
