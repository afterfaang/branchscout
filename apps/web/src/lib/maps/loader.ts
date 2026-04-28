// Google Maps JS SDK lazy loader (v2 functional API).
// VITE_GOOGLE_MAPS_API_KEY tanımlıysa setOptions() bir kez çalıştırılır,
// sonra istenen library'ler `importLibrary` ile yüklenir.
// Tanımlı değilse `null` döner ve UI placeholder mode'a geçer.

import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const API_KEY: string | undefined =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? undefined;

let optionsSet = false;
let mapsPromise: Promise<{
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
}> | null = null;

export function isMapsAvailable(): boolean {
  return Boolean(API_KEY);
}

export function loadMaps(): Promise<{
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
}> | null {
  if (!API_KEY) return null;
  if (mapsPromise) return mapsPromise;
  if (!optionsSet) {
    setOptions({ key: API_KEY, v: "weekly", language: "tr", region: "TR" });
    optionsSet = true;
  }
  mapsPromise = Promise.all([importLibrary("maps"), importLibrary("marker")]).then(
    ([maps, marker]) => ({ maps, marker }),
  );
  return mapsPromise;
}
