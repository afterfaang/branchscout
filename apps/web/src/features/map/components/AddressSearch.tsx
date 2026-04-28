// Address autocomplete — Google Places (New) AutocompleteSuggestion API ile.
// Session token aynı user girişinde tüm tuşlamaları gruplandırır; place
// seçimi token'ı tüketir, sonraki arama için yeni token üretilir.
// Türkiye filtresi (`includedRegionCodes: ["tr"]`).

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { isMapsAvailable, loadMaps } from "../../../lib/maps/loader";

interface Suggestion {
  /** Stable identifier from the suggestion. Used to fetch full place. */
  placePrediction: google.maps.places.PlacePrediction;
  text: string;
  secondaryText: string | null;
}

export interface AddressSearchResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

interface Props {
  onSelect: (result: AddressSearchResult) => void;
  className?: string;
}

export function AddressSearch({ onSelect, className }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputId = useId();

  const available = useMemo(() => isMapsAvailable(), []);

  // Debounced suggestions fetch
  useEffect(() => {
    if (!available) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void runFetch(query);
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, available]);

  if (!available) return null;

  async function runFetch(input: string) {
    const libs = await loadMaps();
    if (!libs) return;
    const PlacesNs = libs.places;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new PlacesNs.AutocompleteSessionToken();
    }
    setLoading(true);
    try {
      const { suggestions: out } = await PlacesNs.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
        language: "tr",
        region: "tr",
        includedRegionCodes: ["tr"],
      });
      setSuggestions(
        out
          .filter((s) => !!s.placePrediction)
          .map((s) => ({
            placePrediction: s.placePrediction!,
            text: s.placePrediction!.mainText?.text ?? s.placePrediction!.text.text,
            secondaryText: s.placePrediction!.secondaryText?.text ?? null,
          })),
      );
    } catch (err) {
      console.error("autocomplete failed", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function pick(s: Suggestion) {
    const place = s.placePrediction.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress"] });
    const loc = place.location;
    if (loc) {
      onSelect({
        lat: loc.lat(),
        lng: loc.lng(),
        formattedAddress: place.formattedAddress ?? s.text,
      });
    }
    // Tüketilen token'ı sıfırla — sonraki yeni arama oturumu için.
    sessionTokenRef.current = null;
    setQuery(s.text);
    setOpen(false);
    setSuggestions([]);
  }

  return (
    <div className={"relative " + (className ?? "")}>
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        placeholder="Adres ya da yer ara..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && query.length >= 2 && (
        <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto z-30">
          {loading && (
            <li className="px-3 py-2 text-xs text-slate-500">aranıyor…</li>
          )}
          {!loading && suggestions.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500">sonuç yok</li>
          )}
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus; pick() runs
                  void pick(s);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
              >
                <div className="text-slate-900">{s.text}</div>
                {s.secondaryText && (
                  <div className="text-xs text-slate-500">{s.secondaryText}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
