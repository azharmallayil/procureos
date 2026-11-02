import { useState, useEffect, useCallback, useRef } from 'react';
import { liveBus, LiveBusMessage, ALL_DATA_KEYS } from './liveSync';
import { persistToSupabase, fetchFromSupabase } from './supabaseSync';

/**
 * useLocalStorage – high-speed multi-tab / multi-user state synchronization.
 *
 * Performance Features:
 * - 0ms instant optimistic UI state transitions
 * - Non-blocking asynchronous Supabase cloud persistence
 * - Real-time WebSocket replication across connected company browsers
 * - Private user navigation isolation
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const isSharedTable = (ALL_DATA_KEYS as readonly string[]).includes(key);

  const getInitial = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // Fallback on corrupt JSON
    }
    const val = typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // Quota fallback
    }
    return val;
  };

  const [state, setState] = useState<T>(getInitial);
  const stateRef = useRef<T>(state);
  stateRef.current = state;

  // Hydrate from live Supabase cloud database on mount if shared table
  useEffect(() => {
    if (!isSharedTable) return;

    let isMounted = true;
    fetchFromSupabase<T>(key).then((cloudData) => {
      if (isMounted && cloudData !== null) {
        setState(cloudData);
        try {
          localStorage.setItem(key, JSON.stringify(cloudData));
        } catch {}
      }
    });

    return () => {
      isMounted = false;
    };
  }, [key, isSharedTable]);

  // Listen for real-time live updates from other tabs or remote peers
  useEffect(() => {
    if (!isSharedTable) {
      return;
    }

    const unsubscribe = liveBus.subscribe((msg: LiveBusMessage) => {
      if (msg.type === 'SYNC_KEY' && msg.key === key && msg.data !== undefined) {
        setState(msg.data);
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

        // 1. Immediate local storage update
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          console.warn(`[ProcureOS] LocalStorage write notice for ${key}:`, err);
        }

        // 2. Realtime peer broadcast for shared tables
        if (isSharedTable) {
          liveBus.publish({
            type: 'SYNC_KEY',
            key,
            data: next,
            timestamp: Date.now(),
          });

          // 3. Asynchronous non-blocking Supabase persistence
          persistToSupabase(key, next).catch(() => {});
        }

        return next;
      });
    },
    [key, isSharedTable]
  );

  return [state, setValue];
}
