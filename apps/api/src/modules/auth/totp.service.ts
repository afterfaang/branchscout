// TOTP servisi — otplib wrapper + recovery code üretici/doğrulayıcı.
//
// Kullanıcı setup-totp çağrısı yaptığında:
//   1. generateSecret(): base32 secret + otpauth URI + QR data URL
//   2. Recovery codes: 10 adet, 8 alfanümerik karakter, argon2id-hash'lenir.
//      Plaintext codes yalnız bir kez kullanıcıya döndürülür ("indir / kaydet").
// verify-totp çağrısında 6 haneli kod RFC 6238 ile doğrulanır.

import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";

export interface TotpSetupResult {
  secret: string;
  otpauthUri: string;
  qrDataUrl: string;
}

const ISSUER = "BranchScout";

export async function generateTotpSetup(opts: {
  accountName: string; // typically user.email
}): Promise<TotpSetupResult> {
  const secret = generateSecret({ length: 20 });
  const otpauthUri = generateURI({
    secret,
    issuer: ISSUER,
    label: opts.accountName,
  });
  const qrDataUrl = await qrcode.toDataURL(otpauthUri, { width: 256, margin: 1 });
  return { secret, otpauthUri, qrDataUrl };
}

export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  // ±30s tolerance for clock drift.
  const result = await verify({ secret, token, epochTolerance: 30 });
  return result.valid;
}

export interface RecoveryCodeBundle {
  /** Plaintext codes, returned to the user once. */
  plaintext: string[];
  /** Hashes to persist (one row per code in `RecoveryCode`). */
  hashes: string[];
}

export async function generateRecoveryCodes(count = 10): Promise<RecoveryCodeBundle> {
  const plaintext: string[] = [];
  for (let i = 0; i < count; i++) {
    plaintext.push(randomCode(8));
  }
  const hashes = await Promise.all(plaintext.map((c) => argon2.hash(c)));
  return { plaintext, hashes };
}

export async function verifyRecoveryCode(
  attempt: string,
  hashes: { id: string; hash: string }[],
): Promise<{ id: string } | null> {
  for (const { id, hash } of hashes) {
    if (await argon2.verify(hash, attempt)) {
      return { id };
    }
  }
  return null;
}

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len: number): string {
  const buf = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += RECOVERY_ALPHABET[buf[i]! % RECOVERY_ALPHABET.length];
  }
  // Insert a hyphen halfway for readability.
  return out.slice(0, len / 2) + "-" + out.slice(len / 2);
}
