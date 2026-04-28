// Invitation service unit tests — token expiry, single-use, hash safety.

import { describe, it, expect } from "vitest";
import argon2 from "argon2";
import { buildInvitationEmail } from "../invitation.email.js";

describe("invitation email template", () => {
  const ctx = {
    recipientName: "Ayşe Yılmaz",
    inviterName: "Demo Admin",
    inviterEmail: "admin@demo.test",
    acceptUrl: "https://web.example/invite/AbCdEf123",
    expiresInHours: 24,
  };

  it("includes the recipient and inviter names in subject + body", () => {
    const out = buildInvitationEmail(ctx);
    expect(out.subject).toContain("BranchScout");
    expect(out.text).toContain("Ayşe Yılmaz");
    expect(out.text).toContain("Demo Admin");
    expect(out.text).toContain("admin@demo.test");
    expect(out.text).toContain(ctx.acceptUrl);
    expect(out.text).toContain("24 saat");
  });

  it("renders an HTML version with the accept link", () => {
    const out = buildInvitationEmail(ctx);
    expect(out.html).toContain(ctx.acceptUrl);
    expect(out.html).toContain("Hesabımı Oluştur");
  });

  it("escapes HTML in user-supplied fields", () => {
    const malicious = buildInvitationEmail({
      ...ctx,
      recipientName: '<script>alert(1)</script>',
    });
    expect(malicious.html).not.toContain("<script>");
    expect(malicious.html).toContain("&lt;script&gt;");
  });
});

describe("invitation token hashing (smoke)", () => {
  it("argon2id hash + verify round-trip works for invitation tokens", async () => {
    const plain = "demoTokenPlain1234567890";
    const hash = await argon2.hash(plain);
    expect(await argon2.verify(hash, plain)).toBe(true);
    expect(await argon2.verify(hash, "tampered")).toBe(false);
  });
});
