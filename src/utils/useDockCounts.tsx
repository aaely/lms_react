import { useCallback, useMemo } from 'react';

type StagedEntry = {
    dock: string;
};

const dockCountKey = (dock: string): string => {
    const normalizedDock = dock.trim().toUpperCase();

    return normalizedDock.includes('803')
        ? '803'
        : normalizedDock;
};

export const useDockCounts = (
    staged: Record<string, StagedEntry>
) => {
    const dockCounters = useMemo(() => {
        const counters = new Map<string, number>();

        Object.values(staged).forEach(entry => {
            const key = dockCountKey(entry.dock);

            counters.set(
                key,
                (counters.get(key) ?? 0) + 1
            );
        });

        return counters;
    }, [staged]);

    const getDockCount = useCallback((dockCode: string): number => {
        return dockCounters.get(dockCountKey(dockCode)) ?? 0;
    }, [dockCounters]);

    return { getDockCount };
};
