// Email provider seçimi — config'e göre concrete impl döndürür.
// Çağırma: `await getEmailProvider(config, logger)`.
// Currently chosen by env vars: POSTMARK_API_TOKEN > MAILHOG_HOST > inmemory.

import type { EmailProvider } from "./EmailProvider.js";
import { InMemoryEmailProvider } from "./InMemoryEmailProvider.js";
import { MailhogEmailProvider } from "./MailhogEmailProvider.js";
import { PostmarkEmailProvider } from "./PostmarkEmailProvider.js";

export type { EmailProvider, EmailMessage } from "./EmailProvider.js";
export { InMemoryEmailProvider } from "./InMemoryEmailProvider.js";

export interface EmailProviderEnv {
  POSTMARK_API_TOKEN?: string;
  POSTMARK_FROM?: string;
  MAILHOG_HOST?: string;
  MAILHOG_PORT?: string;
  MAILHOG_FROM?: string;
}

export interface EmailProviderFactoryOptions {
  env: EmailProviderEnv;
  logger?: (msg: string) => void;
}

let inMemorySingleton: InMemoryEmailProvider | undefined;

export function getInMemoryEmailProvider(
  logger?: (msg: string) => void,
): InMemoryEmailProvider {
  if (!inMemorySingleton) {
    inMemorySingleton = new InMemoryEmailProvider({ logger });
  }
  return inMemorySingleton;
}

export async function buildEmailProvider({
  env,
  logger,
}: EmailProviderFactoryOptions): Promise<EmailProvider> {
  if (env.POSTMARK_API_TOKEN) {
    return PostmarkEmailProvider.create({
      apiToken: env.POSTMARK_API_TOKEN,
      fromAddress: env.POSTMARK_FROM ?? "noreply@branchscout.app",
    });
  }
  if (env.MAILHOG_HOST) {
    return MailhogEmailProvider.create({
      host: env.MAILHOG_HOST,
      port: env.MAILHOG_PORT ? Number(env.MAILHOG_PORT) : 1025,
      fromAddress: env.MAILHOG_FROM ?? "noreply@branchscout.local",
    });
  }
  return getInMemoryEmailProvider(logger);
}
