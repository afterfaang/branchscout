import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      schema: {
        description: "Health check endpoint — returns service status.",
        tags: ["health"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              version: { type: "string" },
              uptime: { type: "number" },
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    async () => ({
      status: "ok",
      version: "0.1.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
}
