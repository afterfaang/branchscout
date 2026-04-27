import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { healthRoutes } from "./modules/health/health.routes.js";

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

  app.get("/", async () => ({
    name: "BranchScout API",
    version: "0.1.0",
    docs: "/docs",
    health: "/health",
  }));

  return app;
}
