import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai'
import { ws as w, wsStatus, wsReconnect, liveTrailers, filteredTrailers, user, partAlerts, type TrailerRecord, type PartAlert } from '../signals/signals';
import { api } from './api';
import { BUILT_IN_DOCK_CAPACITY, dockCapacity, fromRows, type DockCapacityRows } from '../signals/dockCapacity';
import { fromList as blackoutsFromList, routeBlackouts, type RouteBlackout } from '../signals/routeBlackouts';
import { sortTrailers } from './sortTrailers';

const PING_INTERVAL_MS = 30_000;
const RECONNECT_DELAY_MS = 3_000;

const useWS = () => {
  const [,setWS] = useAtom(w);
  const [,setStatus] = useAtom(wsStatus);
  const [,setReconnect] = useAtom(wsReconnect);
  const [,setT] = useAtom(liveTrailers);
  const [,setT1] = useAtom(filteredTrailers);
  const [,setPartAlerts] = useAtom(partAlerts);
  const [,setDockCapacity] = useAtom(dockCapacity);
  const [,setRouteBlackouts] = useAtom(routeBlackouts);
  const [currentUser] = useAtom(user);
  const userRef = useRef(currentUser);
  userRef.current = currentUser;
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const connectRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unmountedRef.current = false;

    // Every retry funnels through here, including the failed-ping path that never
    // reaches onclose, so this is where the nav's status is marked down.
    const scheduleReconnect = () => {
      if (unmountedRef.current) return;
      setStatus('closed');
      if (pingRef.current) clearInterval(pingRef.current);
      reconnectRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (unmountedRef.current) return;

      // Don't connect if not logged in
      if (!userRef.current.email) {
        setStatus('closed');
        return;
      }

      // Already open or connecting — no-op
      const state = wsRef.current?.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      // Cookies are sent automatically by the browser; no token in URL needed
      const ws = new WebSocket(import.meta.env.VITE_WS_URL);
      wsRef.current = ws;
      setWS(ws);
      setStatus('connecting');

      ws.onopen = () => {
        console.log('WS Opened');
        setStatus('open');
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
                          trk.uuid === updated.uuid ? { ...updated, editRef: trk.editRef } : trk
                      )
                  )
                  setT1((prev: TrailerRecord[]) =>
                      prev.map((trk: TrailerRecord) =>
                          trk.uuid === updated.uuid ? { ...updated, editRef: trk.editRef } : trk
                      )
                  )
              } catch (e) {
                  console.error('Failed to parse trailer_update message', e)
              }
              break
          }
          // Both carry a new row for the board the client is on — the server sends
          // 'add_on' only to the live sheet and 'staged_add_on' only to next shift,
          // so whichever arrives belongs in the list.
          case 'add_on':
          case 'staged_add_on': {
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
          case 'shift_rolled': {
            // The whole live board was replaced server-side, so refetch rather
            // than patching rows. get_live_trailers scopes V/U docks by role,
            // so offsite users only get their own dock back.
            (async () => {
              try {
                const trls = await api.get<TrailerRecord[]>('/api/get_live_trailers')
                const sorted = sortTrailers(trls.data)
                setT(sorted)
                setT1(sorted)
              } catch (error) {
                console.error('Failed to refetch live trailers after shift roll', error)
              }
            })()
            break
          }
          // An admin saved Dock Capacity. Sent to every client regardless of page
          // or topic; every screen that shows capacity reads this atom.
          case 'dock_capacity': {
            try {
              const rows: DockCapacityRows = JSON.parse(message.data.message)
              setDockCapacity(fromRows(rows) ?? BUILT_IN_DOCK_CAPACITY)
            } catch (error) {
              console.error('Failed to apply dock capacity update', error)
            }
            break
          }
          // An admin saved Route Blackouts. Sent to every client; the Exception
          // and DY Log forms re-check their delivery time against it.
          case 'route_blackouts': {
            try {
              const list: RouteBlackout[] = JSON.parse(message.data.message)
              setRouteBlackouts(blackoutsFromList(list))
            } catch (error) {
              console.error('Failed to apply route blackout update', error)
            }
            break
          }
          case 'part_alert': {
            try {
              const updated: PartAlert[] = JSON.parse(message.data.message)
              setPartAlerts(updated)
            } catch (error) {
              console.log(error)
            }
            break
          }
          default:
              break
        }
      };

      ws.onclose = () => {
        console.log('closed — reconnecting');
        setStatus('closed');

        if (pingRef.current) {
            clearInterval(pingRef.current);
            pingRef.current = null;
          }

        scheduleReconnect();
      };
    };

    connectRef.current = connect;
    // The outer arrow is jotai's updater form — it returns the value to store.
    setReconnect(() => () => connectRef.current?.());
    connect();

    return () => {
      unmountedRef.current = true;
      connectRef.current = null;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        // onclose is detached here, so the status has to be set directly.
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
      setStatus('closed');
      setReconnect(() => null);
    };
  }, [setWS, setT]);

  // Connect immediately when the user logs in (email transitions from '' to a value).
  // The readyState guard in connect() makes this a no-op if already connected.
  useEffect(() => {
    if (currentUser.email && connectRef.current) {
      connectRef.current();
    }
  }, [currentUser.email]);

  return null;
};

export default useWS;
