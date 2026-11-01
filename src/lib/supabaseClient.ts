import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// ============================================================================
// ProcureOS Supabase Client Wrapper
// Security Guarantee:
// - ONLY uses public anon key with server-enforced PostgreSQL Row Level Security.
// - SERVICE-ROLE KEY MUST NEVER BE IMPORTED OR ACCESSED HERE.
// ============================================================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inform developer if live backend credentials are not set
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co'
);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[ProcureOS Security Guard] Running in simulation mode. Live Supabase credentials not set or set to dummy template.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
