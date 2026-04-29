// Foto galeri: thumbnail grid + lightbox. Sprint 4'te foto'lar Google'dan
// canlı geliyor; URL'ler ~1 saatlik. Sprint 5/8'de R2 mirror aktive olunca
// kalıcı URL'ler photo.url'de gelecek (provider'ın return shape'i değişmez).

import { useEffect, useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import type { PlacePhoto } from "./types";

interface Props {
  photos: PlacePhoto[];
}

const PHOTO_PROXY_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

export function PhotoGallery({ photos }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const slides = useMemo(
    () => photos.map((p) => ({ src: photoUrl(p) })),
    [photos],
  );

  // Reset index if photos array changes.
  useEffect(() => {
    setIndex(0);
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {photos.slice(0, 9).map((p, i) => (
          <button
            key={p.reference || i}
            type="button"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className="aspect-square overflow-hidden rounded bg-slate-100 hover:opacity-90"
          >
            <img
              src={photoUrl(p)}
              alt={`Foto ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      {photos[0]?.authorAttributions?.[0]?.displayName && (
        <p className="text-[10px] text-slate-400 mt-1">
          Foto: {photos[0].authorAttributions[0].displayName}
        </p>
      )}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
      />
    </>
  );
}

function photoUrl(photo: PlacePhoto): string {
  // Sprint 5/8'de mirror'lanmış foto.url'i kullanır.
  if (photo.url) return photo.url;
  // Fallback: backend'in proxy endpoint'ine git (Sprint 5'te eklenecek).
  // Şimdilik Google reference'ı doğrudan v1 media URL'i ile dener.
  if (photo.reference) {
    return `https://places.googleapis.com/v1/${photo.reference}/media?maxWidthPx=800&key=${
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? ""
    }`;
  }
  return `${PHOTO_PROXY_BASE}/static/placeholder.png`;
}
