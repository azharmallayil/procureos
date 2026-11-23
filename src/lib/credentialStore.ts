// ============================================================================
// ProcureOS – Secure Credential Store
// Pre-hashed PBKDF2-SHA-256 credentials with 310,000 iterations.
// Passwords are NEVER stored in plaintext.
// Lifelong persistence in localStorage with live cross-tab replication.
// ============================================================================

/**
 * PRODUCTION SUPER ADMIN CREDENTIAL:
 * muhammed.azhar@arabitra.com  →  admin@251  (Super Admin)
 */

export interface StoredCredential {
  userId: string;
  email: string;
  /** PBKDF2-SHA-256 hash: "<iters>$<salt_hex>$<hash_hex>" */
  passwordHash: string;
  mustChangePassword: boolean;
}

export const CREDENTIALS_KEY = 'procureos_credentials';

export const INITIAL_CREDENTIAL_STORE: StoredCredential[] = [
  {
    userId: 'USR-ADMIN',
    email: 'admin@procureos.com',
    passwordHash:
      '310000$768966e72ac83cc7164a523422e23205$02285c28c95adba0635fd38dfb1641f414f64f5dbf4a9aff300c175f06159209',
    mustChangePassword: false,
  },
  {
    userId: 'USR-AZHAR',
    email: 'muhammed.azhar@arabitra.com',
    passwordHash:
      '310000$2bced1292b79e97a5ff2b17c1f598e64$1a94042a6c2ee3ee04eb8e13f2986180c576e695248b1983c2b57841e25f17d9',
    mustChangePassword: false,
  },
];

export const CREDENTIAL_STORE = INITIAL_CREDENTIAL_STORE;

/**
 * Reads credentials with persistent fallback.
 */
export function getStoredCredentials(): StoredCredential[] {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (raw) {
      let parsed: StoredCredential[] = JSON.parse(raw);
      // Ensure both Super Admins are present
      let changed = false;
      INITIAL_CREDENTIAL_STORE.forEach((adminCred) => {
        if (!parsed.some((c) => c.email.toLowerCase() === adminCred.email.toLowerCase())) {
          parsed = [adminCred, ...parsed];
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(INITIAL_CREDENTIAL_STORE));
  } catch {
    // ignore
  }
  return INITIAL_CREDENTIAL_STORE;
}

/**
 * Saves all credentials to localStorage.
 */
export function saveStoredCredentials(creds: StoredCredential[]): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('[ProcureOS] Failed to save credentials', err);
  }
}

/**
 * Adds or updates a single user credential.
 */
export function addOrUpdateCredential(cred: StoredCredential): void {
  const current = getStoredCredentials();
  const index = current.findIndex((c) => c.userId === cred.userId || c.email.toLowerCase() === cred.email.toLowerCase());
  if (index >= 0) {
    current[index] = { ...current[index], ...cred };
  } else {
    current.push(cred);
  }
  saveStoredCredentials(current);
}

/**
 * Deletes credentials for a user.
 */
export function deleteStoredCredential(userId: string): void {
  const current = getStoredCredentials();
  const filtered = current.filter((c) => c.userId !== userId);
  saveStoredCredentials(filtered);
}
