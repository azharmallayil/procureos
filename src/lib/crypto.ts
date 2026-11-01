// ============================================================================
// ProcureOS – Client-Side Cryptographic Utilities
// All password hashing uses PBKDF2-SHA-256 (Web Crypto API, browser-native).
// Credentials never travel in plaintext; salts are random per-user.
// ============================================================================

const ITERATIONS = 310_000; // NIST SP 800-132 minimum for PBKDF2-SHA-256
const KEY_LENGTH = 32; // 256-bit derived key
const SALT_LENGTH = 16; // 128-bit random salt

/** Encode ArrayBuffer → hex string */
function buf2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Decode hex string → Uint8Array */
function hex2buf(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((h) => parseInt(h, 16)));
}

/**
 * Hash a plaintext password with PBKDF2-SHA-256.
 * Returns a compound string: `<iterations>$<salt_hex>$<hash_hex>`
 * Safe to store in localStorage / Supabase.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return `${ITERATIONS}$${buf2hex(salt.buffer)}$${buf2hex(bits)}`;
}

/**
 * Verify a plaintext password against a stored PBKDF2 hash string.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [iterStr, saltHex, storedHashHex] = parts;
    const iterations = parseInt(iterStr, 10);
    if (!iterations || iterations < 1) return false;

    const salt = hex2buf(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
      keyMaterial,
      KEY_LENGTH * 8
    );
    const candidateHex = buf2hex(bits);

    // Constant-time comparison (prevent timing side-channel)
    if (candidateHex.length !== storedHashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < candidateHex.length; i++) {
      diff |= candidateHex.charCodeAt(i) ^ storedHashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/** Generate a cryptographically random session token (256-bit) */
export function generateSessionToken(): string {
  return buf2hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}

/** Generate a random CSRF token (128-bit) */
export function generateCsrfToken(): string {
  return buf2hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}
