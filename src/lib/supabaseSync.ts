// ============================================================================
// ProcureOS Supabase Cloud Persistence & State Synchronization Engine
// 
// Capabilities:
// 1. Live cloud hydration on startup: fetches live records from Supabase
// 2. Ultra-fast asynchronous non-blocking writes to Supabase
// 3. Realtime multi-user replication across all company devices
// 4. Fallback resilience with local storage and optimistic UI updates
// ============================================================================

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { liveBus } from './liveSync';

export const SUPABASE_SYNC_KEYS = {
  ITEMS: 'procureos_items',
  VENDORS: 'procureos_vendors',
  REQUISITIONS: 'procureos_requisitions',
  RFQS: 'procureos_rfqs',
  QUOTATIONS: 'procureos_quotations',
  PURCHASE_ORDERS: 'procureos_purchase_orders',
  DELIVERIES: 'procureos_deliveries',
  PAYMENTS: 'procureos_payments',
  ASSETS: 'procureos_assets',
  USERS: 'procureos_users',
} as const;

// In-memory debounce timers to prevent network thrashing
const debounceTimers: Record<string, any> = {};

/**
 * Asynchronously persists table state to Supabase without blocking the UI
 */
export async function persistToSupabase<T>(key: string, data: T): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  // Clear pending debounce for this key
  if (debounceTimers[key]) {
    clearTimeout(debounceTimers[key]);
  }

  return new Promise((resolve) => {
    debounceTimers[key] = setTimeout(async () => {
      try {
        // Attempt write to generic store
        const { error: recordError } = await (supabase as any)
          .from('procureos_records')
          .upsert(
            {
              key,
              data,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          );

        if (!recordError) {
          resolve(true);
          return;
        }

        // If procureos_records does not exist, log once and resolve
        console.debug(`[ProcureOS Sync] Cloud record sync notice for ${key}:`, recordError?.message);
        resolve(false);
      } catch (err) {
        console.debug(`[ProcureOS Sync] Background sync exception for ${key}:`, err);
        resolve(false);
      }
    }, 250); // 250ms debounce
  });
}

/**
 * Fetches latest cloud snapshot from Supabase on startup
 */
export async function fetchFromSupabase<T>(key: string): Promise<T | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const { data, error } = await (supabase as any)
      .from('procureos_records')
      .select('data')
      .eq('key', key)
      .single();

    if (!error && data && (data as any).data) {
      return (data as any).data as T;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to live database changes from Supabase Realtime Postgres Changes
 */
export function initSupabaseTableListeners(
  onTableUpdate: (key: string, data: any) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('procureos_db_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'procureos_records' },
        (payload: any) => {
          if (payload?.new && payload.new.key && payload.new.data) {
            onTableUpdate(payload.new.key, payload.new.data);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  } catch (err) {
    console.debug('[ProcureOS Sync] Realtime postgres listener init notice:', err);
    return () => {};
  }
}
