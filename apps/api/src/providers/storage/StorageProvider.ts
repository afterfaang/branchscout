// StorageProvider — kalıcı object storage abstraction.
// Sprint 4: arayüz + InMemory + R2 stub. photoMirror işi Sprint 5'te
// aktive olacak; bu sprint'te interface kuruluyor ki Sprint 5'te
// tek-konfigürasyon değişikliği ile prod'a dahil edilsin.
//
// Implementasyonlar:
//   - InMemoryStorageProvider: dev/test default; data URL döndürür.
//   - R2StorageProvider: Cloudflare R2 (S3-uyumlu); ENV: R2_ACCOUNT_ID,
//     R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.
//
// Public URL: caller bucket-public bir URL bekler. R2'de bucket'a public
// "Public URL" prefix bağlanır (custom domain veya r2.dev) ve onu kullanır.

export interface StorageObject {
  key: string;
  /** Public URL — kullanıcıya direkt verilebilir. */
  publicUrl: string;
  /** Bytes; reporting için. */
  sizeBytes: number;
  contentType: string;
}

export interface StorageProvider {
  readonly name: string;
  /** Object zaten varsa upload'ı atlar (idempotency). */
  exists(key: string): Promise<boolean>;
  /** Yeni object yazar; dön: kalıcı public URL. */
  put(input: {
    key: string;
    body: Buffer | Uint8Array;
    contentType: string;
  }): Promise<StorageObject>;
  /** Var olan object için public URL üret (upload yapmadan). */
  publicUrl(key: string): string;
}
