import { useEffect } from "react";
import { routeDuns } from "../signals/signals";
import { useAtom } from "jotai";
import Papa from 'papaparse'

const useInitParts = () => {
    const [,setParts] = useAtom(routeDuns);
    
    useEffect(() => {
        fetch('/parts_route_duns.csv')
            .then(response => response.text())
            .then(text => {
                Papa.parse(text, {
                    header: false,
                    skipEmptyLines: true,
                    complete: function(results) {
                        const parsedData: any = results.data.map((row: any) => ({
                            part: row[0],
                            duns: row[1],
                            route: row[4]
                        }));
                        
                        const newMap = new Map();
                        parsedData.forEach((part: any) => {
                            const route = part.route.slice(0,6);
                                                        
                            if (!newMap.has(route)) {
                                newMap.set(route, new Set());
                            }
                            newMap.get(route).add(part.part);
                        });
                        console.log(newMap)
                        const finalMap = new Map()
                        newMap.forEach((dunsSet, route) => {
                            finalMap.set(route, Array.from(dunsSet))
                        })
                        setParts(finalMap);
                    }
                });
            })
            .catch(error => console.error('Error loading Locations.csv:', error));
    }, [setParts]);
    
};

export default useInitParts