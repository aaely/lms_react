import { useEffect } from "react";
import { routeDuns } from "../signals/signals";
import { useAtom } from "jotai";
import { api } from "./api";

const useInitParts = () => {
    const [, setParts] = useAtom(routeDuns);

    useEffect(() => {
        api.get('/api/get_part_routes')
            .then(res => {
                const newMap = new Map<string, string[]>();
                res.data.forEach(({ part, route }: { part: string; route: string }) => {
                    const key = route.slice(0, 6);
                    if (!newMap.has(key)) newMap.set(key, []);
                    newMap.get(key)!.push(part);
                });
                setParts(newMap);
            })
            .catch(error => console.error('Error loading part routes:', error));
    }, []);
};

export default useInitParts;
