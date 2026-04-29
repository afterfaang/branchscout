// photoMirror — Google Place Photo'yu kalıcı object storage'a kopyalar.
//
// Sprint 4'te SKELETON ONLY. Henüz BullMQ runner'a wire edilmedi —
// `mirrorPhoto({...})` doğrudan invoke edilebilir (synchronous fallback)
// ama production photoMirror queue Sprint 5'te aktive olacak.
//
// Akış:
//   1. Storage'da `places/{placeId}/{photoIndex}.jpg` zaten varsa atla.
//   2. provider.resolvePhotoUrl(reference) → short-lived URL
//   3. fetch URL → Buffer
//   4. storage.put(...) → kalıcı public URL
//   5. Company.photosJson içindeki foto entry'si güncellenir.
//
// Idempotent: aynı (placeId, reference) çift kez tetiklenirse 1x mirror.

import type { Prisma, PrismaClient } from "@prisma/client";
import type { PlacePhoto, PlacesProvider } from "../providers/places/PlacesProvider.js";
import type { StorageProvider } from "../providers/storage/index.js";
import { withTenant } from "../infrastructure/db/tenantPrisma.js";

export interface MirrorPhotoInput {
  tenantId: string;
  placeId: string;
  photoIndex: number;
  reference: string;
  maxWidthPx?: number;
}

export interface MirrorPhotoResult {
  status: "mirrored" | "already" | "skipped";
  publicUrl?: string;
}

export interface MirrorDeps {
  prisma: PrismaClient;
  provider: PlacesProvider;
  storage: StorageProvider;
  fetchImpl?: typeof fetch;
}

export async function mirrorPhoto(
  deps: MirrorDeps,
  input: MirrorPhotoInput,
): Promise<MirrorPhotoResult> {
  const key = `places/${input.placeId}/${input.photoIndex}.jpg`;
  if (await deps.storage.exists(key)) {
    return { status: "already", publicUrl: deps.storage.publicUrl(key) };
  }
  const sourceUrl = await deps.provider.resolvePhotoUrl(
    input.reference,
    input.maxWidthPx ?? 1600,
  );
  if (!sourceUrl) return { status: "skipped" };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const res = await fetchImpl(sourceUrl);
  if (!res.ok) return { status: "skipped" };
  const buf = Buffer.from(await res.arrayBuffer());
  const obj = await deps.storage.put({
    key,
    body: buf,
    contentType: res.headers.get("content-type") ?? "image/jpeg",
  });

  // Company.photosJson içinde ilgili index'in url'ini güncelle.
  await withTenant(deps.prisma, input.tenantId, async (tx) => {
    const company = await tx.company.findFirst({
      where: { tenantId: input.tenantId, googlePlaceId: input.placeId },
      select: { id: true, photosJson: true },
    });
    if (!company) return;
    const photos = (company.photosJson as PlacePhoto[] | null) ?? [];
    if (photos[input.photoIndex]) {
      photos[input.photoIndex] = { ...photos[input.photoIndex]!, url: obj.publicUrl };
    }
    await tx.company.update({
      where: { id: company.id },
      data: { photosJson: photos as unknown as Prisma.InputJsonValue },
    });
  });

  return { status: "mirrored", publicUrl: obj.publicUrl };
}
