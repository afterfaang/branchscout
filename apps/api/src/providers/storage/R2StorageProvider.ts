// R2StorageProvider — Cloudflare R2, S3-uyumlu API.
//
// Bu sınıfın import yolu @aws-sdk/client-s3 — opsiyonel peer dep. Sprint 4'te
// hazır kuruluyor ama factory tarafından sadece R2 env vars set olduğunda
// instantiate edilir. Sprint 5'te photoMirror job tarafından kullanılacak.
//
// Public URL: ya custom domain (R2_PUBLIC_URL=https://media.branchscout.app)
// ya da varsayılan "https://pub-{hash}.r2.dev" — caller env'de set eder.

import type { StorageObject, StorageProvider } from "./StorageProvider.js";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
  region?: string;
}

export class R2StorageProvider implements StorageProvider {
  readonly name = "r2";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;

  private constructor(
    private readonly config: R2Config,
    client: unknown,
  ) {
    this.client = client;
  }

  static async create(config: R2Config): Promise<R2StorageProvider> {
    if (
      !config.accountId ||
      !config.accessKeyId ||
      !config.secretAccessKey ||
      !config.bucket ||
      !config.publicBaseUrl
    ) {
      throw new Error("R2StorageProvider: missing required config");
    }
    let s3Module: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      S3Client: any;
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      s3Module = await import(/* @vite-ignore */ "@aws-sdk/client-s3");
    } catch {
      throw new Error("@aws-sdk/client-s3 is not installed; R2StorageProvider unavailable");
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const client = new s3Module.S3Client({
      region: config.region ?? "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    return new R2StorageProvider(config, client);
  }

  async exists(key: string): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      const cmds: any = await import(/* @vite-ignore */ "@aws-sdk/client-s3");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const cmd = new cmds.HeadObjectCommand({ Bucket: this.config.bucket, Key: key });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.client.send(cmd);
      return true;
    } catch {
      return false;
    }
  }

  async put(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StorageObject> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    const cmds: any = await import(/* @vite-ignore */ "@aws-sdk/client-s3");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const cmd = new cmds.PutObjectCommand({
      Bucket: this.config.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await this.client.send(cmd);
    return {
      key: input.key,
      publicUrl: this.publicUrl(input.key),
      sizeBytes: input.body.byteLength,
      contentType: input.contentType,
    };
  }

  publicUrl(key: string): string {
    const base = this.config.publicBaseUrl.replace(/\/$/, "");
    return `${base}/${key.replace(/^\//, "")}`;
  }
}
