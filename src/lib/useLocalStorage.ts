import { useState, useEffect, useCallback, useRef } from 'react';
import { liveBus, LiveBusMessage, ALL_DATA_KEYS } from './liveSync';

/**
 * useLocalStorage – persists state with multi-tab / multi-user real-time synchronization.
 *
 * - Survives page refresh and user logout lifelong.
 * - Broadcasts shared enterprise table updates (RFQs, POs, items, etc.) via Supabase
 *   Realtime across all connected company users and local tabs.
 * - Keeps UI navigation and temporary active selections user-scoped and private,
 *   preventing one user's navigation clicks from forcibly redirecting other users.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Check if this key represents a shared database table
  const isSharedTable = (ALL_DATA_KEYS as readonly string[]).includes(key);

  // Resolve initial value once
  const getInitial = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // If JSON is corrupt, fallback to default
    }
    const val = typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // quota or private mode fallback
    }
    return val;
  };

  const [state, setState] = useState<T>(getInitial);
  const stateRef = useRef<T>(state);
  stateRef.current = state;

  // Listen for real-time live updates from other tabs or background operations
  useEffect(() => {
    // Only shared data tables should synchronize from peer broadcast events.
    // UI state (e.g. activeModule, filters) must remain local to each user session.
    if (!isSharedTable) {
      return;
    }

    const unsubscribe = liveBus.subscribe((msg: LiveBusMessage) => {
      if (msg.type === 'SYNC_KEY' && msg.key === key && msg.data !== undefined) {
        // Prevent feedback loop if deep equal
        const incomingStr = JSON.stringify(msg.data);
        const currentStr = JSON.stringify(stateRef.current);
        if (incomingStr !== currentStr) {
          setState(msg.data);
        }
      } else if (msg.type === 'FULL_DATABASE_RESTORE' && msg.data && key in msg.data) {
        setState(msg.data[key]);
      }
    });

    return unsubscribe;
  }, [key, isSharedTable]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setState((prev) => {
        const next =
          typeof action === 'function'
            ? (action as (prev: T) => T)(prev)
            : action;

        // Write immediately to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          console.warn(`[ProcureOS] Failed to write localStorage key: ${key}`, err);
        }

        // Only broadcast shared database tables to other users/sessions
        if (isSharedTable) {
          liveBus.publish({
            type: 'SYNC_KEY',
            key,
            data: next,
            timestamp: Date.now(),
          });
        }

        return next;
      });
    },
    [key, isSharedTable]
  );

  return [state, setValue];
}
