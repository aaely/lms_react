import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai'
import { ws as w, liveTrailers, filteredTrailers, user, type TrailerRecord } from '../signals/signals';
import { store } from '../main';
import { logout } from './api';

const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;

const useWS = () => {
  const [,setWS] = useAtom(w);
  const [,setT] = useAtom(liveTrailers);
  const [,setT1] = useAtom(filteredTrailers);
  const [currentUser] = useAtom(user);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unmountedRef.current = false;

    const scheduleReconnect = () => {
      if (unmountedRef.current) return;
      if (pingRef.current) clearInterval(pingRef.current);
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (unmountedRef.current) return;

      const { accessToken } = store.get(user);
      if (!accessToken) return;

      // Already open or connecting — token rotation, not a new login
      const state = wsRef.current?.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      const ws = new WebSocket(`ws://localhost:9001?token=${accessToken}`);
      wsRef.current = ws;
      setWS(ws);

      ws.onopen = () => {
        console.log('WS Opened');
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const { accessToken, refreshToken } = store.get(user);
            ws.send(JSON.stringify({ type: 'ping', token: accessToken, refresh_token: refreshToken }));
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
          case 'token_refreshed': {
            try {
              const payload = JSON.parse(message.data.message)
              store.set(user, (prev: any) => ({
                ...prev,
                accessToken: payload.token,
                refreshToken: payload.refresh_token,
              }))
            } catch (e) {
              console.error('Failed to parse token_refreshed message', e)
            }
            break
          }
          case 'force_logout':
            logout()
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

    connectRef.current = connect;
    connect();

    return () => {
      unmountedRef.current = true;
      connectRef.current = null;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [setWS, setT]);

  // Connect immediately when the user logs in (token transitions from '' to value).
  // The readyState guard in connect() makes this a no-op during token rotation.
  useEffect(() => {
    if (currentUser.accessToken && connectRef.current) {
      connectRef.current();
    }
  }, [currentUser.accessToken]);

  return null;
};

export default useWS;
