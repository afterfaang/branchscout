import { useQuery } from "@tanstack/react-query";
import { fetchMyRegions } from "./regionsApi";
import { useAuthStore } from "../auth/authStore";
import { Navigate } from "react-router-dom";

export function MyRegionsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const query = useQuery({
    queryKey: ["regions", "my"],
    queryFn: fetchMyRegions,
  });

  // BRANCH_MANAGER also gets their region but the page is most useful for
  // REGION_MANAGER + ADMIN. Other roles are redirected to home.
  if (role && role !== "ADMIN" && role !== "REGION_MANAGER" && role !== "BRANCH_MANAGER") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Bölgelerim</h1>
      <p className="text-sm text-slate-500 mb-6">
        Erişebildiğiniz bölgeler ve onlara bağlı şubeler.
      </p>
      {query.isLoading && <p className="text-slate-500">Yükleniyor…</p>}
      {query.isError && (
        <p className="text-red-600 text-sm">Bölgeler yüklenemedi.</p>
      )}
      {query.data?.regions.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-slate-500 text-sm">
          Görüntüleyebileceğiniz bir bölge bulunamadı.
        </div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {query.data?.regions.map((r) => (
          <div
            key={r.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-1">{r.name}</h2>
            <div className="text-xs text-slate-500 mb-3">
              {r.branches.length} şube
            </div>
            <ul className="space-y-2">
              {r.branches.map((b) => (
                <li key={b.id} className="border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <div className="text-sm font-medium">
                    <span className="font-mono text-xs text-slate-500 mr-2">
                      {b.code}
                    </span>
                    {b.name}
                  </div>
                  <div className="text-xs text-slate-500">{b.address}</div>
                </li>
              ))}
              {r.branches.length === 0 && (
                <li className="text-xs text-slate-500">Bu bölgede şube yok.</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
