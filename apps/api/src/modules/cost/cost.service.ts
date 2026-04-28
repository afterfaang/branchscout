// Cost tracking — record every paid outbound API call.
//
// Çağrı API endpoint katmanından geçmeden önce ya da response yazılmadan önce
// `recordCost(prisma, { ... })` ile yazılır. ApiCostEvent.tenantId nullable —
// global çağrılar (cron job'lar) için NULL set edilir; Sprint 2'de hep tenant
// bağlamında çağrı yaptığımız için her zaman dolu.

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { withAuthLookup } from "../../infrastructure/db/tenantPrisma.js";

export interface CostEventInput {
  tenantId?: string | null;
  userId?: string | null;
  provider: string;
  endpoint: string;
  costUsd: number;
  metadata?: Record<string, unknown>;
}

export async function recordCost(
  prisma: PrismaClient,
  event: CostEventInput,
): Promise<void> {
  // ApiCostEvent.tenantId NULL olabilir → policy `auth_lookup = on` istiyor.
  await withAuthLookup(prisma, (tx) =>
    tx.apiCostEvent.create({
      data: {
        tenantId: event.tenantId ?? null,
        userId: event.userId ?? null,
        provider: event.provider,
        endpoint: event.endpoint,
        costUsd: new Prisma.Decimal(event.costUsd),
        metadata: (event.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    }),
  );
}

export interface DailyCostSummary {
  totalUsd: number;
  byProvider: { provider: string; calls: number; usd: number }[];
  byEndpoint: { provider: string; endpoint: string; calls: number; usd: number }[];
}

/** Today's spend summary, scoped to a tenant when provided. */
export async function getTodayCosts(
  prisma: PrismaClient,
  tenantId: string | null,
): Promise<DailyCostSummary> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const events = await withAuthLookup(prisma, (tx) =>
    tx.apiCostEvent.findMany({
      where: {
        createdAt: { gte: start },
        ...(tenantId ? { tenantId } : {}),
      },
      select: { provider: true, endpoint: true, costUsd: true },
    }),
  );

  const byProvider = new Map<string, { calls: number; usd: number }>();
  const byEndpoint = new Map<string, { calls: number; usd: number; provider: string; endpoint: string }>();
  let totalUsd = 0;
  for (const e of events) {
    const usd = Number(e.costUsd);
    totalUsd += usd;
    const prov = byProvider.get(e.provider) ?? { calls: 0, usd: 0 };
    prov.calls += 1;
    prov.usd += usd;
    byProvider.set(e.provider, prov);

    const key = `${e.provider}::${e.endpoint}`;
    const ep = byEndpoint.get(key) ?? { calls: 0, usd: 0, provider: e.provider, endpoint: e.endpoint };
    ep.calls += 1;
    ep.usd += usd;
    byEndpoint.set(key, ep);
  }
  return {
    totalUsd,
    byProvider: [...byProvider.entries()].map(([provider, v]) => ({ provider, ...v })),
    byEndpoint: [...byEndpoint.values()],
  };
}
