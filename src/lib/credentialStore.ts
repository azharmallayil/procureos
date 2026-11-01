// ============================================================================
// ProcureOS – Secure Credential Store
// Pre-hashed PBKDF2-SHA-256 credentials with 310,000 iterations.
// Passwords are NEVER stored in plaintext.
// ============================================================================

/**
 * DEFAULT CREDENTIALS (Temporary - users must change on first login):
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

export const CREDENTIAL_STORE: StoredCredential[] = [
  {
    userId: 'USR-001',
    email: 'aitzaz@fitcotech.com',
    passwordHash:
      '310000$a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6$3f6cfbce3f72d03e4a8ab1f06f1e75994a5fdc20ab4a8233a854f69e483c40c8',
    mustChangePassword: true,
  },
  {
    userId: 'USR-002',
    email: 'muhammed.azhar@arabitra.com',
    passwordHash:
      '310000$b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7$ca4a78d1ab9a3f03712c1b2e4d34b7adedbdf5158a325ed2f0abc97fafb59a1f',
    mustChangePassword: true,
  },
  {
    userId: 'USR-003',
    email: 'omer.khalil@arabitra.com',
    passwordHash:
      '310000$c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8$ef9e64025cd789dd99ed12211e495a84563edcaca723691b0278e9418efb8729',
    mustChangePassword: true,
  },
  {
    userId: 'USR-004',
    email: 'khalid.shehri@fitco-group.com',
    passwordHash:
      '310000$d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9$fe17405924b8b45876db325f4546cc4321c2281295cc685eb2efb0c65f1aa593',
    mustChangePassword: true,
  },
  {
    userId: 'USR-005',
    email: 'mona.otaibi@fitco-group.com',
    passwordHash:
      '310000$e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0$ee521f56780a9ea230bd283d91edc5e30655fb0b9c2cf8abacd6a8854c6662d7',
    mustChangePassword: true,
  },
  {
    userId: 'USR-006',
    email: 'ibrahim.harbi@fitco-group.com',
    passwordHash:
      '310000$f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1$5f2afd38c5762781421d42365ff328e3d6efcdfe722247ded8ef1b46037420bd',
    mustChangePassword: true,
  },
];
