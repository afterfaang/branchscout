// Sağ slide-in panel. URL ?placeId=... ile state yönetilir.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlaceDetails, recordWebsiteClick, refreshPlaceDetails } from "./placesApi";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "../map/types";
import { ApiError } from "../../lib/apiClient";
import { OpeningHoursView } from "./OpeningHours";
import { PhotoGallery } from "./PhotoGallery";

interface Props {
  placeId: string | null;
  onClose: () => void;
}

const fmtDate = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function PlaceDetailsPanel({ placeId, onClose }: Props) {
  const qc = useQueryClient();
  const open = !!placeId;

  // ESC kapatır.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const detailsQ = useQuery({
    queryKey: ["place-details", placeId],
    queryFn: () => fetchPlaceDetails(placeId!),
    enabled: !!placeId,
    staleTime: 60_000,
  });

  const refreshM = useMutation({
    mutationFn: () => refreshPlaceDetails(placeId!),
    onSuccess: (res) => {
      qc.setQueryData(["place-details", placeId], res);
    },
  });

  const clickM = useMutation({
    mutationFn: (url: string) => recordWebsiteClick(placeId!, url),
  });

  if (!open) return null;

  const detail = detailsQ.data?.data;
  const meta = detailsQ.data?.meta;
  const error = detailsQ.error;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {/* Backdrop — clicking it closes the panel. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute inset-0 bg-slate-900/15 pointer-events-auto"
      />
      {/* Slide-in card */}
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute right-0 top-0 h-full w-full md:w-[400px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto pointer-events-auto"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-3 flex items-start gap-2">
          <div className="flex-1 min-w-0">
            {detail ? (
              <>
                <h2 className="font-semibold text-slate-900 text-base leading-tight truncate">
                  {detail.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ background: CATEGORY_COLOR[detail.category] }}
                  />
                  <span>{CATEGORY_LABEL[detail.category]}</span>
                  {detail.rating != null && (
                    <span>
                      · ⭐ {detail.rating} ({detail.reviewCount ?? 0})
                    </span>
                  )}
                </div>
              </>
            ) : (
              <h2 className="font-semibold text-slate-400 text-sm">Yükleniyor…</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {detailsQ.isLoading && (
            <p className="text-sm text-slate-500">Detaylar yükleniyor…</p>
          )}

          {error && (
            <div role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error instanceof ApiError ? error.body?.detail ?? error.message : "Detaylar yüklenemedi"}
            </div>
          )}

          {detail && (
            <>
              {detail.formattedAddress && (
                <Field label="Adres">{detail.formattedAddress}</Field>
              )}

              {detail.phone && (
                <Field label="Telefon">
                  <a href={`tel:${detail.phone}`} className="text-brand-600 hover:underline">
                    {detail.phone}
                  </a>
                </Field>
              )}

              {detail.websiteUri && (
                <Field label="Website">
                  <a
                    href={detail.websiteUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => clickM.mutate(detail.websiteUri!)}
                    className="text-brand-600 hover:underline break-all"
                  >
                    {detail.websiteUri}
                  </a>
                </Field>
              )}

              {detail.hours && (
                <Field label="Açılış Saatleri">
                  <OpeningHoursView hours={detail.hours} />
                </Field>
              )}

              {detail.photos.length > 0 && (
                <Field label={`Fotoğraflar (${detail.photos.length})`}>
                  <PhotoGallery photos={detail.photos} />
                </Field>
              )}

              <Field label="Sonraki Sprint'lerde">
                <p className="text-xs text-slate-500">
                  MERSİS resmi kayıt, web özetleyici, haber paneli ve ziyaret listesi entegrasyonu sırada.
                </p>
              </Field>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {meta?.source === "db" && "DB"}
                  {meta?.source === "cache" && "cache"}
                  {meta?.source === "api" && "Google Places"}
                  {meta?.lastEnrichedAt && (
                    <> · {fmtDate.format(new Date(meta.lastEnrichedAt))}</>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => refreshM.mutate()}
                  disabled={refreshM.isPending}
                  className="text-brand-600 hover:underline disabled:opacity-50"
                >
                  {refreshM.isPending ? "Yenileniyor…" : "Detayları Yenile"}
                </button>
              </div>
              {refreshM.error && refreshM.error instanceof ApiError &&
                refreshM.error.status === 429 && (
                  <p className="text-xs text-amber-600">
                    Saatlik yenileme limitine takıldınız (30/saat).
                  </p>
                )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}
