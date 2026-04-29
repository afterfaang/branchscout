// InMemoryStorageProvider — RAM'de Map<key, Buffer>; data: URL döndürür.
// Test/dev için. Prod'da R2 (veya başka S3-uyumlu) seçilir.

import type { StorageObject, StorageProvider } from "./StorageProvider.js";

export class InMemoryStorageProvider implements StorageProvider {
  readonly name = "inmemory";
  private readonly objects = new Map<
    string,
    { body: Buffer; contentType: string; size: number }
  >();

  async exists(key: string): Promise<boolean> {
    return this.objects.has(key);
  }

  async put(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StorageObject> {
    const buf = Buffer.from(input.body);
    this.objects.set(input.key, {
      body: buf,
      contentType: input.contentType,
      size: buf.length,
    });
    return {
      key: input.key,
      publicUrl: this.publicUrl(input.key),
      sizeBytes: buf.length,
      contentType: input.contentType,
    };
  }

  publicUrl(key: string): string {
    const entry = this.objects.get(key);
    if (!entry) return `data:application/octet-stream;base64,`; // sentinel
    return `data:${entry.contentType};base64,${entry.body.toString("base64")}`;
  }

  /** Test helper. */
  clear(): void {
    this.objects.clear();
  }

  /** Test helper — number of stored objects. */
  size(): number {
    return this.objects.size;
  }
}
