import { buildServer } from "./server.js";
import { config } from "./config.js";

const server = await buildServer();

try {
  await server.listen({ port: config.port, host: "0.0.0.0" });
  server.log.info(`🚀 BranchScout API listening on :${config.port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}

const shutdown = async (signal: string) => {
  server.log.info(`${signal} received, shutting down…`);
  await server.close();
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
