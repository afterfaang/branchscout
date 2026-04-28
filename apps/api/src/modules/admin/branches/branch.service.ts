// Branch admin servisi — soft delete + tenant scope.
// Geocoding (adres → koordinat) Sprint 2'de eklenir; şimdilik
// catchmentPolygon opsiyonel (Json) olarak alınır.

import { Prisma, type Branch } from "@prisma/client";
import type { TenantBoundClient } from "../../../infrastructure/db/tenantPrisma.js";

export interface BranchInput {
  code: string;
  name: string;
  address: string;
  regionId?: string | null;
  catchmentPolygon?: Prisma.InputJsonValue | null;
}

export class BranchError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "DUPLICATE_CODE" | "INVALID_REGION",
  ) {
    super(message);
    this.name = "BranchError";
  }
}

export async function listBranches(
  tx: TenantBoundClient,
  opts: { includeDeleted?: boolean } = {},
): Promise<Branch[]> {
  return tx.branch.findMany({
    where: opts.includeDeleted ? undefined : { deletedAt: null },
    orderBy: { code: "asc" },
  });
}

export async function createBranch(
  tx: TenantBoundClient,
  tenantId: string,
  input: BranchInput,
): Promise<Branch> {
  // Tenant scope is implicitly enforced by RLS, but pass explicit tenantId
  // for the insert anyway.
  const dup = await tx.branch.findFirst({
    where: { tenantId, code: input.code },
  });
  if (dup) throw new BranchError(`Şube kodu zaten kayıtlı: ${input.code}`, "DUPLICATE_CODE");

  if (input.regionId) {
    const region = await tx.region.findFirst({
      where: { id: input.regionId, tenantId },
    });
    if (!region) throw new BranchError("Bölge bulunamadı", "INVALID_REGION");
  }

  return tx.branch.create({
    data: {
      tenantId,
      code: input.code,
      name: input.name,
      address: input.address,
      regionId: input.regionId ?? null,
      catchmentPolygon: input.catchmentPolygon ?? Prisma.JsonNull,
    },
  });
}

export async function updateBranch(
  tx: TenantBoundClient,
  tenantId: string,
  id: string,
  patch: Partial<BranchInput>,
): Promise<Branch> {
  const existing = await tx.branch.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) throw new BranchError("Şube bulunamadı", "NOT_FOUND");

  if (patch.code && patch.code !== existing.code) {
    const dup = await tx.branch.findFirst({
      where: { tenantId, code: patch.code, NOT: { id } },
    });
    if (dup) throw new BranchError(`Şube kodu zaten kayıtlı: ${patch.code}`, "DUPLICATE_CODE");
  }

  if (patch.regionId) {
    const region = await tx.region.findFirst({
      where: { id: patch.regionId, tenantId },
    });
    if (!region) throw new BranchError("Bölge bulunamadı", "INVALID_REGION");
  }

  return tx.branch.update({
    where: { id },
    data: {
      code: patch.code,
      name: patch.name,
      address: patch.address,
      regionId: patch.regionId,
      catchmentPolygon:
        patch.catchmentPolygon === undefined
          ? undefined
          : (patch.catchmentPolygon ?? Prisma.JsonNull),
    },
  });
}

export async function softDeleteBranch(
  tx: TenantBoundClient,
  tenantId: string,
  id: string,
): Promise<void> {
  const existing = await tx.branch.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) throw new BranchError("Şube bulunamadı", "NOT_FOUND");

  await tx.branch.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

