import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import prismaPlugin from "./plugins/prisma.js";
import jwtPlugin from "./plugins/jwt.js";
import tenantContextPlugin from "./plugins/tenantContext.js";
import dbPlugin from "./plugins/db.js";
import emailPlugin from "./plugins/email.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { invitationRoutes } from "./modules/invitations/invitation.routes.js";
import { branchRoutes } from "./modules/admin/branches/branch.routes.js";
import { adminUserRoutes } from "./modules/admin/users/user.routes.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      transport: config.isProd
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "HH:MM:ss" },
          },
    },
    genReqId: () => randomUUID(),
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "request_id",
    disableRequestLogging: false,
    trustProxy: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // SwaggerUI needs inline; tighten in Sprint 15
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });

  await app.register(sensible);

  // Core infrastructure plugins
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);
  await app.register(tenantContextPlugin);
  await app.register(dbPlugin);
  await app.register(emailPlugin);

  await app.register(swagger, {
    openapi: {
      info: {
        title: "BranchScout API",
        description: "Şube müdürü saha keşif ve ziyaret planlama API'si",
        version: "0.1.0",
      },
      servers: [{ url: "/" }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  // RFC 7807 problem-details error handler
  app.setErrorHandler((error: import("fastify").FastifyError, request, reply) => {
    request.log.error({ err: error }, "request error");
    const status = error.statusCode ?? 500;
    reply.status(status).send({
      type: `https://branchscout.app/errors/${error.code ?? "internal"}`,
      title: error.name ?? "Error",
      status,
      detail: error.message,
      instance: request.url,
      request_id: request.id,
    });
  });

  // Routes
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(invitationRoutes, { prefix: "/api/v1" });
  await app.register(branchRoutes, { prefix: "/api/v1" });
  await app.register(adminUserRoutes, { prefix: "/api/v1" });

  app.get("/", async () => ({
    name: "BranchScout API",
    version: "0.1.0",
    docs: "/docs",
    health: "/health",
  }));

  return app;
}
