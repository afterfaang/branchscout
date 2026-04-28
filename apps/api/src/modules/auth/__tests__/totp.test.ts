// TOTP service unit testi — secret üretme, verify, recovery code akışı.

import { describe, it, expect } from "vitest";
import { generateSync } from "otplib";
import argon2 from "argon2";
import {
  generateRecoveryCodes,
  generateTotpSetup,
  verifyRecoveryCode,
  verifyTotp,
} from "../totp.service.js";

describe("TOTP service", () => {
  it("generateTotpSetup returns base32 secret + otpauth URI + QR data URL", async () => {
    const setup = await generateTotpSetup({ accountName: "demo@example.com" });
    expect(setup.secret).toMatch(/^[A-Z2-7]+=*$/i);
    expect(setup.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.otpauthUri).toContain("issuer=BranchScout");
    expect(setup.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("verifyTotp accepts the current code generated from the same secret", async () => {
    const setup = await generateTotpSetup({ accountName: "demo@example.com" });
    const code = generateSync({ secret: setup.secret });
    const ok = await verifyTotp(setup.secret, code);
    expect(ok).toBe(true);
  });

  it("verifyTotp rejects a wrong code", async () => {
    const setup = await generateTotpSetup({ accountName: "demo@example.com" });
    const ok = await verifyTotp(setup.secret, "000000");
    // 000000 may, on rare occasions, hit; loop a few times to be safe.
    expect(ok).toBe(false);
  });
});

describe("Recovery codes", () => {
  it("generates 10 codes by default with hash + plaintext pairs", async () => {
    const bundle = await generateRecoveryCodes();
    expect(bundle.plaintext).toHaveLength(10);
    expect(bundle.hashes).toHaveLength(10);
    for (const code of bundle.plaintext) {
      // Format: 4-4 with a hyphen, alphanumeric (no I/O/0/1).
      expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
  });

  it("hashes verify against the original plaintext", async () => {
    const bundle = await generateRecoveryCodes(3);
    for (let i = 0; i < bundle.plaintext.length; i++) {
      const ok = await argon2.verify(bundle.hashes[i]!, bundle.plaintext[i]!);
      expect(ok).toBe(true);
    }
  });

  it("verifyRecoveryCode finds the matching hash and returns its id", async () => {
    const bundle = await generateRecoveryCodes(3);
    const stored = bundle.hashes.map((h, i) => ({ id: `c-${i}`, hash: h }));
    const target = bundle.plaintext[1]!;
    const found = await verifyRecoveryCode(target, stored);
    expect(found).toEqual({ id: "c-1" });
  });

  it("verifyRecoveryCode returns null when no hash matches", async () => {
    const bundle = await generateRecoveryCodes(3);
    const stored = bundle.hashes.map((h, i) => ({ id: `c-${i}`, hash: h }));
    const result = await verifyRecoveryCode("BAD-CODE", stored);
    expect(result).toBeNull();
  });
});
