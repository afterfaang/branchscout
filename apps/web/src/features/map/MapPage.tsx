import { useQuery } from "@tanstack/react-query";

const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

interface Health {
  status: string;
  version: string;
  uptime: number;
  timestamp: string;
}

export function MapPage() {
  const { data, isLoading, error } = useQuery<Health>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/health`);
      if (!res.ok) throw new Error("API unreachable");
      return (await res.json()) as Health;
    },
    refetchInterval: 10_000,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Hoş Geldiniz, BranchScout
        </h1>
        <p className="text-slate-600">
          Banka şube müdürleri için saha keşif ve ziyaret planlama uygulaması.
          Sprint 1&apos;de auth + multi-tenant tamamlandı; Sprint 2&apos;de
          harita ve Google Places gelecek.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="API Durumu">
          {isLoading && <span className="text-slate-500">kontrol ediliyor…</span>}
          {error && (
            <span className="text-red-600">⚠ API&apos;ye ulaşılamıyor</span>
          )}
          {data && (
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-slate-500">Durum: </span>
                <span className="text-emerald-600 font-medium">
                  {data.status}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Sürüm: </span>
                <span className="font-mono">{data.version}</span>
              </div>
              <div>
                <span className="text-slate-500">Uptime: </span>
                <span className="font-mono">{data.uptime.toFixed(0)}s</span>
              </div>
            </div>
          )}
        </Card>

        <Card title="Sıradaki Sprint">
          <div className="text-sm text-slate-600 space-y-2">
            <div>
              <span className="font-medium text-slate-900">Sprint 1:</span>{" "}
              Auth, multi-tenant, kullanıcı yönetimi
            </div>
            <div>
              <span className="font-medium text-slate-900">Sprint 2:</span>{" "}
              Harita çekirdeği + Google Places
            </div>
          </div>
        </Card>

        <Card title="Stack">
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• React 18 + Vite + TypeScript</li>
            <li>• Tailwind + TanStack Query</li>
            <li>• Fastify + Prisma + Postgres</li>
            <li>• Railway + GitHub Actions</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}
