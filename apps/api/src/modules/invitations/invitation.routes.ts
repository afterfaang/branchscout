// Invitation routes — public accept + admin invite/list/revoke.

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "../../config.js";
import {
  INVITATION_TTL_HOURS,
  InvitationError,
  acceptInvitation,
  createInvitation,
  findInvitationByToken,
  listInvitations,
  revokeInvitation,
} from "./invitation.service.js";
import { buildInvitationEmail } from "./invitation.email.js";
import { withAuthLookup } from "../../infrastructure/db/tenantPrisma.js";

const InviteRequest = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(["ADMIN", "REGION_MANAGER", "BRANCH_MANAGER", "ANALYST"]),
  branchId: z.string().optional().nullable(),
});

const AcceptRequest = z.object({
  token: z.string().min(8),
  password: z.string().min(8, "Parola en az 8 karakter olmalı").max(200),
});

function buildAcceptUrl(token: string): string {
  // Web app uses /invite/:token; CORS_ORIGIN[0] is the canonical web URL.
  const base = config.corsOrigins[0] ?? "http://localhost:5173";
  return `${base.replace(/\/$/, "")}/invite/${encodeURIComponent(token)}`;
}

export async function invitationRoutes(app: FastifyInstance) {
  // -------- public --------

  app.get(
    "/invitations/:token",
    {
      schema: {
        description: "Davet detaylarını görüntüle (token doğrulanır).",
        tags: ["invitations"],
        params: {
          type: "object",
          properties: { token: { type: "string" } },
          required: ["token"],
        },
      },
    },
    async (request, reply) => {
      const { token } = request.params as { token: string };
      const inv = await findInvitationByToken(app.prisma, token);
      if (!inv) throw app.httpErrors.notFound("Davet bulunamadı veya süresi doldu");
      return reply.send({
        email: inv.email,
        name: inv.name,
        role: inv.role,
        branch: inv.branch,
        expiresAt: inv.expiresAt,
      });
    },
  );

  app.post(
    "/invitations/accept",
    {
      schema: {
        description: "Davet token'ı + parola ile hesabı aktifleştir.",
        tags: ["invitations"],
      },
    },
    async (request, reply) => {
      const parsed = AcceptRequest.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      try {
        const result = await acceptInvitation(app.prisma, {
          tokenPlain: parsed.data.token,
          password: parsed.data.password,
        });
        // Auto-login: issue tokens immediately so the client can transition.
        const tokens = app.jwt.issueTokens({
          userId: result.userId,
          tenantId: result.tenantId,
          role: result.role,
        });
        return reply.send({
          status: "ok",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: config.jwt.accessTtl,
          user: {
            id: result.userId,
            tenantId: result.tenantId,
            email: result.email,
            name: result.name,
            role: result.role,
            branchId: result.branchId,
          },
        });
      } catch (err) {
        if (err instanceof InvitationError) {
          if (err.code === "NOT_FOUND") throw app.httpErrors.notFound(err.message);
          throw app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );

  // -------- admin --------

  app.post(
    "/admin/users/invite",
    {
      schema: {
        description: "Yeni kullanıcı davet et (ADMIN rolü gerekir).",
        tags: ["admin", "invitations"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const parsed = InviteRequest.safeParse(request.body);
      if (!parsed.success) throw app.httpErrors.badRequest(parsed.error.message);
      const auth = request.auth!;

      // Resolve inviter name — needed for email body.
      const inviter = await withAuthLookup(app.prisma, (tx) =>
        tx.user.findFirst({
          where: { id: auth.userId, tenantId: auth.tenantId },
          select: { name: true, email: true },
        }),
      );
      if (!inviter) throw app.httpErrors.unauthorized("Davet eden kullanıcı bulunamadı");

      try {
        const created = await createInvitation(app.prisma, {
          tenantId: auth.tenantId,
          email: parsed.data.email,
          name: parsed.data.name,
          role: parsed.data.role,
          branchId: parsed.data.branchId ?? null,
          invitedById: auth.userId,
        });

        const email = buildInvitationEmail({
          recipientName: parsed.data.name,
          inviterName: inviter.name,
          inviterEmail: inviter.email,
          acceptUrl: buildAcceptUrl(created.tokenPlain),
          expiresInHours: INVITATION_TTL_HOURS,
        });
        await app.email.send({
          to: parsed.data.email,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });

        request.log.info(
          { invitationId: created.id, recipient: parsed.data.email },
          "invitation created",
        );

        return reply.code(201).send({
          id: created.id,
          email: parsed.data.email,
          expiresAt: created.expiresAt,
        });
      } catch (err) {
        if (err instanceof InvitationError) {
          throw app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );

  app.get(
    "/admin/users/invitations",
    {
      schema: {
        description: "Bu tenant'taki davetleri listele (ADMIN).",
        tags: ["admin", "invitations"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const auth = request.auth!;
      const list = await listInvitations(app.prisma, auth.tenantId);
      return reply.send({
        invitations: list.map((inv) => ({
          id: inv.id,
          email: inv.email,
          name: inv.name,
          role: inv.role,
          branch: inv.branch,
          invitedBy: inv.invitedBy,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt,
          revokedAt: inv.revokedAt,
        })),
      });
    },
  );

  app.delete(
    "/admin/users/invitations/:id",
    {
      schema: {
        description: "Davet iptal et (ADMIN).",
        tags: ["admin", "invitations"],
        security: [{ bearerAuth: [] }],
      },
      preHandler: app.requireRole("ADMIN"),
    },
    async (request, reply) => {
      const auth = request.auth!;
      const { id } = request.params as { id: string };
      try {
        await revokeInvitation(app.prisma, auth.tenantId, id);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof InvitationError) {
          if (err.code === "NOT_FOUND") throw app.httpErrors.notFound(err.message);
          throw app.httpErrors.badRequest(err.message);
        }
        throw err;
      }
    },
  );
}
