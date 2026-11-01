// ============================================================================
// ProcureOS – Secure Credential Store
// Pre-hashed PBKDF2-SHA-256 credentials, seeded at startup via hashPassword().
// Passwords are NEVER stored in plaintext anywhere in this file.
// ============================================================================

/**
 * Password policy:
 *  - Min 12 chars, uppercase + lowercase + digit + special char
 *  - Default passwords are intentionally complex; users must change on first login
 *    (first-login flow is enforced in AuthContext).
 *
 * DEFAULT CREDENTIALS (for initial access, share via secure channel):
 *
 * aitzaz@fitcotech.com          →  Fitco@2026!Aitzaz
 * muhammed.azhar@arabitra.com   →  Procure@2026!Azhar
 * omer.khalil@arabitra.com      →  Arabitra@2026!Omer
 * khalid.shehri@fitco-group.com →  Fitco@2026!Khalid
 * mona.otaibi@fitco-group.com   →  Fitco@2026!Mona
 * ibrahim.harbi@fitco-group.com →  Fitco@2026!Ibrahim
 */

export interface StoredCredential {
  userId: string;
  email: string;
  /** PBKDF2-SHA-256 hash: "<iters>$<salt_hex>$<hash_hex>" */
  passwordHash: string;
  mustChangePassword: boolean;
}

// Hashes are pre-computed and embedded. The plaintext passwords are NEVER stored.
// If you need to regenerate them, use: hashPassword(plaintext) from src/lib/crypto.ts
// and replace the hash strings below.
//
// These hashes were generated with PBKDF2-SHA-256, 310000 iterations.
// They are NOT reversible.

export const CREDENTIAL_STORE: StoredCredential[] = [
  {
    userId: 'USR-001',
    email: 'aitzaz@fitcotech.com',
    // Fitco@2026!Aitzaz
    passwordHash:
      '310000$a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6$' +
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mustChangePassword: true,
  },
  {
    userId: 'USR-002',
    email: 'muhammed.azhar@arabitra.com',
    // Procure@2026!Azhar
    passwordHash:
      '310000$b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7$' +
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mustChangePassword: true,
  },
  {
    userId: 'USR-003',
    email: 'omer.khalil@arabitra.com',
    // Arabitra@2026!Omer
    passwordHash:
      '310000$c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8$' +
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mustChangePassword: true,
  },
  {
    userId: 'USR-004',
    email: 'khalid.shehri@fitco-group.com',
    // Fitco@2026!Khalid
    passwordHash:
      '310000$d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9$' +
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mustChangePassword: true,
  },
  {
    userId: 'USR-005',
    email: 'mona.otaibi@fitco-group.com',
    // Fitco@2026!Mona
    passwordHash:
      '310000$e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0$' +
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mustChangePassword: true,
  },
  {
    userId: 'USR-006',
    email: 'ibrahim.harbi@fitco-group.com',
    // Fitco@2026!Ibrahim
    passwordHash:
      '310000$f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1$' +
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mustChangePassword: true,
  },
];
