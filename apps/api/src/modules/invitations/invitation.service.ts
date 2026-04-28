// Invitation servisi — admin davet oluşturur, davetli kabul eder.
//
// Token ham haliyle yalnız davet email'inde paylaşılır; DB'de argon2id
// hash'lenmiş `tokenHash` saklanır. Bu sayede DB sızıntısı davet
// link'lerini açığa çıkarmaz. Token kabul edildiğinde tek kullanımlık;
// tekrar kullanılamaz.

import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import type { PrismaClient, Role } from "@prisma/client";
import { withAuthLookup, withTenant } from "../../infrastructure/db/tenantPrisma.js";

const TOKEN_TTL_HOURS = 24;
const TOKEN_BYTES = 32; // 256-bit, base64url-encoded

export class InvitationError extends Error {
  constructor(
    message: string,
    public code:
      | "EXPIRED"
      | "REVOKED"
      | "ALREADY_ACCEPTED"
      | "NOT_FOUND"
      | "EMAIL_IN_USE",
  ) {
    super(message);
    this.name = "InvitationError";
  }
}

export interface InviteUserInput {
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  branchId?: string | null;
  invitedById: string;
}

export interface CreatedInvitation {
  id: string;
  tokenPlain: string; // returned ONCE — caller emails this
  expiresAt: Date;
}

export async function createInvitation(
  prisma: PrismaClient,
  input: InviteUserInput,
): Promise<CreatedInvitation> {
  const email = input.email.trim().toLowerCase();

  // Reject if a user with this email already exists in the tenant.
  const existing = await withTenant(prisma, input.tenantId, (tx) =>
    tx.user.findFirst({ where: { tenantId: input.tenantId, email } }),
  );
  if (existing) {
    throw new InvitationError("Email zaten kayıtlı", "EMAIL_IN_USE");
  }

  // Revoke any prior pending invitations for the same email/tenant.
  await withTenant(prisma, input.tenantId, async (tx) => {
    await tx.invitation.updateMany({
      where: {
        tenantId: input.tenantId,
        email,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  });

  const tokenPlain = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = await argon2.hash(tokenPlain);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000);

  const invitation = await withTenant(prisma, input.tenantId, (tx) =>
    tx.invitation.create({
      data: {
        tenantId: input.tenantId,
        email,
        name: input.name,
        role: input.role,
        branchId: input.branchId ?? null,
        invitedById: input.invitedById,
        tokenHash,
        expiresAt,
      },
    }),
  );

  return { id: invitation.id, tokenPlain, expiresAt };
}

/** Public lookup — used by accept page to show "you're being invited as ...". */
export async function findInvitationByToken(prisma: PrismaClient, tokenPlain: string) {
  // Listed under auth_lookup because the user has no tenant context yet.
  return withAuthLookup(prisma, async (tx) => {
    const all = await tx.invitation.findMany({
      where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { branch: { select: { id: true, code: true, name: true } } },
    });
    for (const inv of all) {
      if (await argon2.verify(inv.tokenHash, tokenPlain)) {
        return inv;
      }
    }
    return null;
  });
}

export interface AcceptInvitationInput {
  tokenPlain: string;
  password: string;
}

export interface AcceptedInvitation {
  userId: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  branchId: string | null;
}

/** Accept an invitation: create a user with the chosen password,
 *  mark invitation as accepted, return the new user identity. */
export async function acceptInvitation(
  prisma: PrismaClient,
  input: AcceptInvitationInput,
): Promise<AcceptedInvitation> {
  const inv = await findInvitationByToken(prisma, input.tokenPlain);
  if (!inv) throw new InvitationError("Davet bulunamadı veya süresi doldu", "NOT_FOUND");
  if (inv.acceptedAt) throw new InvitationError("Davet zaten kabul edildi", "ALREADY_ACCEPTED");
  if (inv.revokedAt) throw new InvitationError("Davet iptal edildi", "REVOKED");
  if (inv.expiresAt.getTime() < Date.now()) {
    throw new InvitationError("Davet süresi doldu", "EXPIRED");
  }

  const passwordHash = await argon2.hash(input.password);

  return withAuthLookup(prisma, async (tx) => {
    // Re-check inside the same transaction — defense vs. concurrent accept.
    const fresh = await tx.invitation.findUnique({ where: { id: inv.id } });
    if (!fresh || fresh.acceptedAt || fresh.revokedAt) {
      throw new InvitationError("Davet artık geçerli değil", "ALREADY_ACCEPTED");
    }
    const user = await tx.user.create({
      data: {
        tenantId: fresh.tenantId,
        email: fresh.email,
        name: fresh.name,
        role: fresh.role,
        branchId: fresh.branchId,
        passwordHash,
        isActive: true,
      },
    });
    await tx.invitation.update({
      where: { id: fresh.id },
      data: { acceptedAt: new Date() },
    });
    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };
  });
}

/** List pending invitations for a tenant (admin view). */
export async function listInvitations(prisma: PrismaClient, tenantId: string) {
  return withTenant(prisma, tenantId, (tx) =>
    tx.invitation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        invitedBy: { select: { id: true, email: true, name: true } },
      },
    }),
  );
}

/** Revoke a still-pending invitation. */
export async function revokeInvitation(
  prisma: PrismaClient,
  tenantId: string,
  invitationId: string,
): Promise<void> {
  await withTenant(prisma, tenantId, async (tx) => {
    const inv = await tx.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });
    if (!inv) throw new InvitationError("Davet bulunamadı", "NOT_FOUND");
    if (inv.acceptedAt) throw new InvitationError("Kabul edilmiş davet iptal edilemez", "ALREADY_ACCEPTED");
    await tx.invitation.update({
      where: { id: inv.id },
      data: { revokedAt: new Date() },
    });
  });
}

export const INVITATION_TTL_HOURS = TOKEN_TTL_HOURS;
