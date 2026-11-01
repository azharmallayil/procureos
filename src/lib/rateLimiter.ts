// ============================================================================
// ProcureOS – Rate Limiter (in-memory, per-username)
// Implements exponential back-off to defeat brute-force login attacks.
// ============================================================================

interface AttemptRecord {
  count: number;
  lockedUntil: number; // epoch ms
  lastAttempt: number;
}

const store = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = [0, 5_000, 30_000, 120_000, 300_000, 900_000]; // per failure tier

function getRecord(key: string): AttemptRecord {
  return store.get(key) ?? { count: 0, lockedUntil: 0, lastAttempt: 0 };
}

/** Returns remaining lock time in ms (0 means not locked). */
export function getLockoutMs(username: string): number {
  const rec = getRecord(username.toLowerCase());
  const remaining = rec.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Record a failed attempt; returns new lock duration in ms. */
export function recordFailure(username: string): number {
  const key = username.toLowerCase();
  const rec = getRecord(key);
  const newCount = rec.count + 1;
  const tier = Math.min(newCount, LOCK_DURATION_MS.length - 1);
  const lockMs = newCount >= MAX_ATTEMPTS ? LOCK_DURATION_MS[tier] : 0;
  store.set(key, {
    count: newCount,
    lockedUntil: lockMs ? Date.now() + lockMs : 0,
    lastAttempt: Date.now(),
  });
  return lockMs;
}

/** Reset attempt counter on successful login. */
export function clearFailures(username: string): void {
  store.delete(username.toLowerCase());
}

/** Format lock duration for display. */
export function formatLockDuration(ms: number): string {
  if (ms <= 0) return '';
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  return `${Math.ceil(ms / 60_000)} min`;
}

