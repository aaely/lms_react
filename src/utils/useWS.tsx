import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai'
import { ws as w, liveTrailers, filteredTrailers, type TrailerRecord } from '../signals/signals';

const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;

const useWS = () => {
  const [,setWS] = useAtom(w);
  const [,setT] = useAtom(liveTrailers);
  const [,setT1] = useAtom(filteredTrailers);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    unmountedRef.current = false;

    const scheduleReconnect = () => {
      if (unmountedRef.current) return;
      if (pingRef.current) clearInterval(pingRef.current);
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (unmountedRef.current) return;

      const ws = new WebSocket(`ws://localhost:9001`);
      wsRef.current = ws;
      setWS(ws);

      ws.onopen = () => {
        console.log('WS Opened');
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            console.log('ping failed — reconnecting');
            scheduleReconnect();
          }
        }, PING_INTERVAL_MS);
      };

      ws.onerror = (e) => {
        console.log('WS error — reconnecting', e);
        ws.close();
      };

      ws.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        console.log(message);

        switch (message.type) {
          case 'ping':
            break
          case 'trailer_update': {
              try {
                  const updated: TrailerRecord = JSON.parse(message.data.message)
                  setT((prev: TrailerRecord[]) =>
                      prev.map((trk: TrailerRecord) =>
                          trk.uuid === updated.uuid ? { ...updated } : trk
                      )
                  )
                  setT1((prev: TrailerRecord[]) =>
                      prev.map((trk: TrailerRecord) =>
                          trk.uuid === updated.uuid ? { ...updated } : trk
                      )
                  )
              } catch (e) {
                  console.error('Failed to parse trailer_update message', e)
              }
              break
          }
          case 'add_on': {
            try {
              const updated: TrailerRecord = JSON.parse(message.data.message)
              setT((prev: TrailerRecord[]) => [...prev, updated])
              setT1((prev: TrailerRecord[]) => [...prev, updated])
              break;
            } catch (error) {
              console.log(error)
              break
            }
          }
          default:
              break
        }
      };

      ws.onclose = () => {
        console.log('closed — reconnecting');
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [setWS, setT]);

  return null;
};

export default useWS;