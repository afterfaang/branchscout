// Sol alt köşede toplanabilir panel: kayıtlı aramalar listesi + kaydet/sil.
// Veri modeli `SavedQuery` (center, radius, polygon, categories, zoom).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type SavedQuery,
  type SavedSearch,
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
} from "../savedSearchesApi";

interface Props {
  /** Snapshot of the current map state, captured fresh on save. */
  capture: () => SavedQuery;
  /** Restore the chosen saved search onto the map. */
  onLoad: (q: SavedQuery) => void;
}

export function SavedSearchPanel({ capture, onLoad }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const list = useQuery({
    queryKey: ["saved-searches"],
    queryFn: listSavedSearches,
    enabled: open,
  });

  const createM = useMutation({
    mutationFn: (newName: string) =>
      createSavedSearch({ name: newName, queryJson: capture() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["saved-searches"] });
      setName("");
    },
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["saved-searches"] }),
  });

  return (
    <div className="absolute top-4 right-[260px] z-10 w-72">
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <span>★ Kayıtlı Aramalar</span>
          <span className="text-xs text-slate-400">{open ? "▴" : "▾"}</span>
        </button>
        {open && (
          <div className="border-t border-slate-100">
            <form
              className="flex gap-2 px-3 py-2 border-b border-slate-100"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                createM.mutate(name.trim());
              }}
            >
              <input
                type="text"
                placeholder="Mevcut aramayı kaydet..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={!name.trim() || createM.isPending}
                className="rounded bg-brand-600 text-white text-xs font-medium px-2 py-1 disabled:opacity-50"
              >
                Kaydet
              </button>
            </form>
            <div className="max-h-56 overflow-y-auto">
              {list.isLoading && (
                <p className="text-xs text-slate-500 px-3 py-2">yükleniyor…</p>
              )}
              {list.data && list.data.savedSearches.length === 0 && (
                <p className="text-xs text-slate-500 px-3 py-2">
                  Henüz kayıtlı arama yok.
                </p>
              )}
              {list.data?.savedSearches.map((s: SavedSearch) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => onLoad(s.queryJson)}
                    className="flex-1 text-left text-slate-700 truncate"
                    title={summarize(s.queryJson)}
                  >
                    {s.name}
                    <span className="block text-[10px] text-slate-400">
                      {summarize(s.queryJson)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`"${s.name}" silinsin mi?`)) deleteM.mutate(s.id);
                    }}
                    className="ml-2 text-red-500 hover:text-red-700"
                    title="Sil"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function summarize(q: SavedQuery): string {
  const parts: string[] = [];
  if (q.polygon) parts.push("Poligon");
  else if (q.radius) parts.push(`${q.radius >= 1000 ? `${q.radius / 1000}km` : `${q.radius}m`}`);
  if (q.categories && q.categories.length > 0) parts.push(`${q.categories.length} kategori`);
  if (q.center) parts.push(`${q.center.lat.toFixed(3)},${q.center.lng.toFixed(3)}`);
  return parts.join(" · ") || "boş";
}
