import { useRef, useEffect } from 'react'

function useInterval(callback: () => void, delay: number | null, immediate = false) {
  const savedCallback = useRef<() => void>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (immediate) {
      savedCallback.current?.();
    }
  }, [immediate]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => {
      savedCallback.current?.();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

export default useInterval