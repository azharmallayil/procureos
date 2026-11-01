import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useLocalStorage – behaves exactly like useState but persists the value
 * to localStorage under the given key.
 *
 * - On first mount, reads from localStorage if a value exists;
 *   otherwise uses the initializer (value or factory function).
 * - Every state change is written to localStorage synchronously.
 * - Skips writes when the value is unchanged (referential equality).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Resolve initial value once
  const getInitial = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // If JSON is corrupt, fall through to default
      localStorage.removeItem(key);
    }
    return typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;
  };

  const [state, setState] = useState<T>(getInitial);
  const prevRef = useRef<T>(state);

  useEffect(() => {
    if (prevRef.current !== state) {
      prevRef.current = state;
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Quota exceeded — silent fail (still works in memory)
      }
    }
  }, [key, state]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setState((prev) => {
        const next =
          typeof action === 'function'
            ? (action as (prev: T) => T)(prev)
            : action;
        // Write immediately so it's never lost even between renders
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // silent
        }
        return next;
      });
    },
    [key]
  );

  return [state, setValue];
}

/** Clear all ProcureOS data keys from localStorage (e.g. on logout) */
const PROCUREOS_KEYS = [
  'procureos_items',
  'procureos_vendors',
  'procureos_rfqs',
  'procureos_quotations',
  'procureos_purchase_orders',
  'procureos_deliveries',
  'procureos_payments',
  'procureos_assets',
  'procureos_active_module',
];

export function clearProcureOSStore(): void {
  PROCUREOS_KEYS.forEach((k) => localStorage.removeItem(k));
}

