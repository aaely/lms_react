import { useEffect } from 'react';
import { useAtom } from 'jotai'
import { ws as w, liveTrailers, filteredTrailers, type TrailerRecord } from '../signals/signals';

const useWS = () => {
  const [,setWS] = useAtom(w);
  const [,setT] = useAtom(liveTrailers);
  const [,setT1] = useAtom(filteredTrailers);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:9001`);
    setWS(ws);

    ws.onopen = () => {
      console.log('WS Opened');
    };

    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      console.log(message);

      switch (message.type) {
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
      console.log('closed');
    };

    return () => {
      console.log('closing connection');
      ws.close();
    };
  }, [setWS, setT]);

  return null;
};

export default useWS;