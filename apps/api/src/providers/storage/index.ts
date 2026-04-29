// Storage provider factory — env'e göre seçim.
// Sprint 5'te aktive olur. Sprint 4'te sadece interface + factory hazır.

import type { StorageProvider } from "./StorageProvider.js";
import { InMemoryStorageProvider } from "./InMemoryStorageProvider.js";
import { R2StorageProvider } from "./R2StorageProvider.js";

export type { StorageProvider, StorageObject } from "./StorageProvider.js";
export { InMemoryStorageProvider } from "./InMemoryStorageProvider.js";

export interface StorageEnv {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_URL?: string;
}

export async function buildStorageProvider(opts: {
  env: StorageEnv;
  logger?: (msg: string) => void;
}): Promise<StorageProvider> {
  const e = opts.env;
  if (e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET) {
    try {
      const provider = await R2StorageProvider.create({
        accountId: e.R2_ACCOUNT_ID,
        accessKeyId: e.R2_ACCESS_KEY_ID,
        secretAccessKey: e.R2_SECRET_ACCESS_KEY,
        bucket: e.R2_BUCKET,
        publicBaseUrl: e.R2_PUBLIC_URL ?? `https://pub-${e.R2_ACCOUNT_ID}.r2.dev`,
      });
      opts.logger?.("storage: R2 connected");
      return provider;
    } catch (err) {
      opts.logger?.(`storage: R2 init failed (${(err as Error).message}); using inmemory`);
    }
  } else {
    opts.logger?.("storage: R2 env not set; using inmemory");
  }
  return new InMemoryStorageProvider();
}
