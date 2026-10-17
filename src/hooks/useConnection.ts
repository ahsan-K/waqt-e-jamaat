import { onValue } from 'firebase/database';
import { useEffect, useState } from 'react';

import { dbRef } from '@/services/firebase/db';

/**
 * RTDB connection state via `.info/connected` (true = live). Starts optimistic and only reports
 * offline after a short grace period so app start doesn't flash a banner.
 */
export function useConnection(graceMs = 4000): boolean {
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = onValue(dbRef('.info/connected'), (snap) => {
      clearTimeout(timer);
      if (snap.val() === true) setConnected(true);
      else timer = setTimeout(() => setConnected(false), graceMs);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [graceMs]);
  return connected;
}
