import { useQuery } from "@tanstack/react-query";
import { fetchTodayCosts } from "./costsApi";

const fmt = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
});

export function CostsPage() {
  const query = useQuery({
    queryKey: ["admin", "costs", "today"],
    queryFn: fetchTodayCosts,
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">API Maliyeti — Bugün</h1>
        <p className="text-sm text-slate-500">
          Tenant kapsamındaki bugün gerçekleşen tüm dış API çağrılarının özeti. 30 saniyede bir yenilenir.
        </p>
      </div>

      {query.isLoading && <p className="text-slate-500">Yükleniyor…</p>}
      {query.isError && (
        <p className="text-red-600 text-sm">Maliyet verisi yüklenemedi.</p>
      )}

      {query.data && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              Toplam (USD)
            </div>
            <div className="text-4xl font-bold text-slate-900 font-mono">
              {fmt.format(query.data.totalUsd)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {query.data.byProvider.reduce((sum, p) => sum + p.calls, 0)} toplam çağrı
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-100">
              Sağlayıcıya Göre
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="py-2 px-4 font-medium">Sağlayıcı</th>
                  <th className="py-2 px-4 font-medium text-right">Çağrı</th>
                  <th className="py-2 px-4 font-medium text-right">Maliyet (USD)</th>
                </tr>
              </thead>
              <tbody>
                {query.data.byProvider.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 px-4 text-center text-slate-500">
                      Bugün henüz API çağrısı yok.
                    </td>
                  </tr>
                )}
                {query.data.byProvider.map((row) => (
                  <tr key={row.provider} className="border-t border-slate-100">
                    <td className="py-2 px-4 font-mono text-xs">{row.provider}</td>
                    <td className="py-2 px-4 text-right">{row.calls}</td>
                    <td className="py-2 px-4 text-right font-mono">
                      {fmt.format(row.usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h2 className="text-sm font-semibold text-slate-700 px-4 py-3 border-b border-slate-100">
              Endpoint Kırılımı
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="py-2 px-4 font-medium">Sağlayıcı</th>
                  <th className="py-2 px-4 font-medium">Endpoint</th>
                  <th className="py-2 px-4 font-medium text-right">Çağrı</th>
                  <th className="py-2 px-4 font-medium text-right">Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {query.data.byEndpoint.map((row) => (
                  <tr key={`${row.provider}::${row.endpoint}`} className="border-t border-slate-100">
                    <td className="py-2 px-4 font-mono text-xs">{row.provider}</td>
                    <td className="py-2 px-4 font-mono text-xs">{row.endpoint}</td>
                    <td className="py-2 px-4 text-right">{row.calls}</td>
                    <td className="py-2 px-4 text-right font-mono">
                      {fmt.format(row.usd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}
