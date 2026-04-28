import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Supercluster, { type ClusterFeature } from "supercluster";
import { useSearchParams } from "react-router-dom";
import { isMapsAvailable, loadMaps } from "../../lib/maps/loader";
import { useAuthStore } from "../auth/authStore";
import { searchNearby, searchPolygon, type GeoJsonPolygon } from "./placesApi";
import { ApiError } from "../../lib/apiClient";
import {
  ALL_CATEGORIES,
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  type PlaceCategory,
  type PlaceSummary,
} from "./types";

// Default fallback center: Kadıköy seed branch.
const DEFAULT_CENTER = { lat: 40.99, lng: 29.03 };
const RADII = [500, 1000, 2000, 5000] as const;

interface PinFeatureProps {
  placeId: string;
  category: PlaceCategory;
  name: string;
}

export function MapPage() {
  const user = useAuthStore((s) => s.user);
  const mapsAvailable = isMapsAvailable();

  const [searchParams, setSearchParams] = useSearchParams();
  const lat = Number(searchParams.get("lat")) || DEFAULT_CENTER.lat;
  const lng = Number(searchParams.get("lng")) || DEFAULT_CENTER.lng;
  const radius = Number(searchParams.get("radius")) || 1000;

  const updateUrl = useCallback(
    (next: Partial<{ lat: number; lng: number; radius: number }>) => {
      const params = new URLSearchParams(searchParams);
      if (next.lat !== undefined) params.set("lat", next.lat.toFixed(6));
      if (next.lng !== undefined) params.set("lng", next.lng.toFixed(6));
      if (next.radius !== undefined) params.set("radius", String(next.radius));
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polygonOverlayRef = useRef<google.maps.Polygon | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [searchMeta, setSearchMeta] = useState<{ source: string; count: number } | null>(null);
  const [drawingActive, setDrawingActive] = useState(false);
  const [polygonError, setPolygonError] = useState<string | null>(null);

  const searchM = useMutation({
    mutationFn: () => searchNearby({ lat, lng, radius, maxResults: 50 }),
    onSuccess: (res) => {
      setPlaces(res.data);
      setSearchMeta({ source: res.meta.source, count: res.meta.count });
      clearPolygonOverlay();
    },
  });

  const polygonM = useMutation({
    mutationFn: (polygon: GeoJsonPolygon) => searchPolygon({ polygon, maxResults: 200 }),
    onSuccess: (res) => {
      setPlaces(res.data);
      setSearchMeta({ source: res.meta.source, count: res.meta.count });
      setPolygonError(null);
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError
          ? (err.body?.detail ?? err.message)
          : "Polygon araması başarısız oldu";
      setPolygonError(msg);
    },
  });

  const clearPolygonOverlay = useCallback(() => {
    if (polygonOverlayRef.current) {
      polygonOverlayRef.current.setMap(null);
      polygonOverlayRef.current = null;
    }
  }, []);

  // Initialise the map once.
  useEffect(() => {
    if (!mapsAvailable) return;
    let cancelled = false;
    void (async () => {
      try {
        const libs = await loadMaps();
        if (cancelled || !libs || !containerRef.current) return;
        const { Map } = libs.maps;
        const map = new Map(containerRef.current, {
          center: { lat, lng },
          zoom: 14,
          mapId: "BRANCHSCOUT_MAP",
          disableDefaultUI: false,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });
        mapRef.current = map;

        map.addListener("idle", () => {
          const c = map.getCenter();
          if (c) updateUrl({ lat: c.lat(), lng: c.lng() });
        });
        // Drawing manager — kapalı duruyor, button ile aktif edilir.
        const dm = new libs.drawing.DrawingManager({
          drawingControl: false,
          polygonOptions: {
            strokeColor: "#10b981",
            strokeWeight: 2,
            fillColor: "#10b981",
            fillOpacity: 0.12,
            clickable: false,
            editable: false,
          },
        });
        dm.setMap(map);
        drawingManagerRef.current = dm;

        dm.addListener("polygoncomplete", (poly: google.maps.Polygon) => {
          // Switch out of drawing mode.
          dm.setDrawingMode(null);
          setDrawingActive(false);

          // Replace any previous overlay.
          if (polygonOverlayRef.current) polygonOverlayRef.current.setMap(null);
          polygonOverlayRef.current = poly;

          // Convert path → GeoJSON ring (closed).
          const ring: [number, number][] = [];
          poly.getPath().forEach((p) => ring.push([p.lng(), p.lat()]));
          if (ring.length > 0 && (ring[0]![0] !== ring.at(-1)![0] || ring[0]![1] !== ring.at(-1)![1])) {
            ring.push([ring[0]![0], ring[0]![1]]);
          }
          const geoJson: GeoJsonPolygon = { type: "Polygon", coordinates: [ring] };

          // Clear circle while polygon is active.
          if (circleRef.current) {
            circleRef.current.setMap(null);
            circleRef.current = null;
          }

          polygonM.mutate(geoJson);
        });

        setMapReady(true);
      } catch (err) {
        console.error("map init failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsAvailable]);

  const startDrawing = useCallback(async () => {
    const libs = await loadMaps();
    const dm = drawingManagerRef.current;
    if (!libs || !dm) return;
    setPolygonError(null);
    clearPolygonOverlay();
    dm.setDrawingMode(libs.drawing.OverlayType.POLYGON);
    setDrawingActive(true);
  }, [clearPolygonOverlay]);

  const cancelDrawing = useCallback(() => {
    const dm = drawingManagerRef.current;
    if (dm) dm.setDrawingMode(null);
    setDrawingActive(false);
    clearPolygonOverlay();
    setPolygonError(null);
  }, [clearPolygonOverlay]);

  // Sync the radius circle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    void (async () => {
      const libs = await loadMaps();
      if (cancelled || !libs) return;
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      const circle = new libs.maps.Circle({
        map,
        center: { lat, lng },
        radius,
        strokeColor: "#2563eb",
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.08,
        clickable: false,
      });
      circleRef.current = circle;
    })();
    return () => {
      cancelled = true;
    };
  }, [mapReady, lat, lng, radius]);

  // Render pins (with clustering).
  const supercluster = useMemo(() => {
    const cluster = new Supercluster<PinFeatureProps>({
      radius: 60,
      maxZoom: 17,
      minZoom: 0,
      minPoints: 4,
    });
    cluster.load(
      places.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          placeId: p.googlePlaceId,
          category: p.category,
          name: p.name,
        },
      })),
    );
    return cluster;
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;
    void (async () => {
      const libs = await loadMaps();
      if (cancelled || !libs) return;
      // Wipe existing markers first.
      for (const m of markersRef.current) m.map = null;
      markersRef.current = [];

      const bounds = map.getBounds();
      if (!bounds) return;
      const zoom = map.getZoom() ?? 14;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const features = supercluster.getClusters(
        [sw.lng(), sw.lat(), ne.lng(), ne.lat()],
        Math.round(zoom),
      );

      const { AdvancedMarkerElement } = libs.marker;
      for (const feature of features) {
        const [pinLng, pinLat] = feature.geometry.coordinates as [number, number];
        const isCluster = (feature.properties as { cluster?: boolean }).cluster;
        const el = document.createElement("div");
        if (isCluster) {
          const count = (feature as ClusterFeature<PinFeatureProps>).properties.point_count;
          el.className =
            "rounded-full bg-brand-600 text-white text-xs font-semibold flex items-center justify-center shadow-md ring-2 ring-white";
          const size = Math.min(48, 24 + Math.round(Math.log2(count) * 6));
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.textContent = String(count);
        } else {
          const props = feature.properties as PinFeatureProps;
          el.className =
            "rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-semibold";
          el.style.width = "20px";
          el.style.height = "20px";
          el.style.background = CATEGORY_COLOR[props.category];
          el.title = `${props.name} — ${CATEGORY_LABEL[props.category]}`;
        }
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: pinLat, lng: pinLng },
          content: el,
        });
        if (!isCluster) {
          marker.addListener("click", () => {
            const props = feature.properties as PinFeatureProps;
            alert(
              `${props.name}\nKategori: ${CATEGORY_LABEL[props.category]}\n\nSprint 4'te detay paneli gelecek.`,
            );
          });
        }
        markersRef.current.push(marker);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mapReady, supercluster, places.length]);

  if (!mapsAvailable) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Harita</h1>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-4 py-3 text-sm mb-6">
          <strong>Demo modu.</strong> Google Maps API anahtarı henüz ayarlanmadığı için
          gerçek harita yerine arama listesi gösteriliyor. <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code>{" "}
          eklendiğinde otomatik olarak gerçek harita aktif olur.
        </div>
        <DemoSearchPanel
          onSearch={() => searchM.mutate()}
          loading={searchM.isPending}
          places={places}
          meta={searchMeta}
        />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-130px)]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top-left: branch info */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm px-3 py-2 text-sm">
        <div className="font-semibold text-slate-900">
          {user?.name ?? "Kullanıcı"}
        </div>
        <div className="text-xs text-slate-500">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </div>
      </div>

      {/* Bottom bar: radius selector + draw + search */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full shadow-md px-2 py-1.5">
        {RADII.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => updateUrl({ radius: r })}
            disabled={drawingActive}
            className={
              "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 " +
              (r === radius
                ? "bg-brand-600 text-white"
                : "text-slate-700 hover:bg-slate-100")
            }
          >
            {r >= 1000 ? `${r / 1000}km` : `${r}m`}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-300" />
        <button
          type="button"
          onClick={() => searchM.mutate()}
          disabled={searchM.isPending || drawingActive}
          className="rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-1.5 disabled:opacity-50"
        >
          {searchM.isPending ? "Aranıyor…" : "Bu Bölgede Ara"}
        </button>
        <span className="mx-1 h-5 w-px bg-slate-300" />
        {!drawingActive ? (
          <button
            type="button"
            onClick={() => void startDrawing()}
            disabled={polygonM.isPending}
            className="rounded-full border border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-4 py-1.5 disabled:opacity-50"
          >
            ✏ Alan Çiz
          </button>
        ) : (
          <button
            type="button"
            onClick={cancelDrawing}
            className="rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-1.5"
          >
            İptal (Çizim modu)
          </button>
        )}
        {polygonOverlayRef.current && !drawingActive && (
          <button
            type="button"
            onClick={cancelDrawing}
            className="rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-medium px-3 py-1.5"
          >
            Alanı Temizle
          </button>
        )}
        {searchMeta && (
          <span className="ml-2 text-xs text-slate-500">
            {searchMeta.count} sonuç ·{" "}
            <span className={searchMeta.source === "cache" ? "text-emerald-600" : "text-slate-500"}>
              {searchMeta.source === "cache" ? "cache" : "API"}
            </span>
          </span>
        )}
      </div>

      {/* Polygon error banner */}
      {polygonError && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md shadow-sm px-3 py-2 max-w-md">
          {polygonError}
          <button
            type="button"
            onClick={() => setPolygonError(null)}
            className="ml-2 text-xs text-red-600 underline"
          >
            kapat
          </button>
        </div>
      )}
      {polygonM.isPending && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200 text-slate-700 text-sm rounded-md shadow-sm px-3 py-2">
          Poligon içindeki firmalar getiriliyor…
        </div>
      )}

      {/* Top-right: legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-md shadow-sm px-3 py-2 text-xs space-y-1">
        <div className="font-semibold text-slate-700 mb-1">Kategori</div>
        {ALL_CATEGORIES.map((c) => (
          <div key={c} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: CATEGORY_COLOR[c] }}
            />
            <span className="text-slate-700">{CATEGORY_LABEL[c]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DemoPanelProps {
  onSearch: () => void;
  loading: boolean;
  places: PlaceSummary[];
  meta: { source: string; count: number } | null;
}

function DemoSearchPanel({ onSearch, loading, places, meta }: DemoPanelProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Yakındaki Firmalar (Kadıköy)</h3>
        <button
          type="button"
          onClick={onSearch}
          disabled={loading}
          className="rounded-md bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
        >
          {loading ? "Aranıyor…" : "Ara"}
        </button>
      </div>
      {meta && (
        <div className="text-xs text-slate-500 mb-3">
          {meta.count} sonuç ·{" "}
          <span className={meta.source === "cache" ? "text-emerald-600" : "text-slate-500"}>
            {meta.source === "cache" ? "cache" : "API"}
          </span>
        </div>
      )}
      {places.length === 0 ? (
        <p className="text-sm text-slate-500">
          &ldquo;Ara&rdquo; diyerek {RADII[1] / 1000} km yarıçap içindeki demo firmaları listeleyin.
        </p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-2">
          {places.map((p) => (
            <li
              key={p.googlePlaceId}
              className="border border-slate-200 rounded-md p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium text-slate-900">{p.name}</div>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: CATEGORY_COLOR[p.category] }}
                  title={CATEGORY_LABEL[p.category]}
                />
              </div>
              <div className="text-xs text-slate-500">
                {CATEGORY_LABEL[p.category]}
                {p.formattedAddress ? ` · ${p.formattedAddress}` : ""}
              </div>
              {p.rating != null && (
                <div className="text-xs text-slate-500 mt-1">
                  ⭐ {p.rating} ({p.reviewCount ?? 0})
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
