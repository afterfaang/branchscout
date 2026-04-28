// Email plugin — yapılandırmaya uygun EmailProvider'ı başlatır ve `app.email`
// olarak decorate eder.

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import {
  buildEmailProvider,
  type EmailProvider,
} from "../providers/email/index.js";

declare module "fastify" {
  interface FastifyInstance {
    email: EmailProvider;
  }
}

async function emailPlugin(app: FastifyInstance) {
  const provider = await buildEmailProvider({
    env: process.env,
    logger: (msg) => app.log.info({ provider: "email" }, msg),
  });
  app.log.info({ provider: provider.name }, "email provider initialised");
  app.decorate("email", provider);
}

export default fp(emailPlugin, { name: "email" });
