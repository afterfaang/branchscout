// Places provider factory — config'e göre Google veya InMemory döner.
//
// Çalışma kuralı:
//   - GOOGLE_MAPS_API_KEY set → GooglePlacesProvider
//   - aksi halde InMemoryPlacesProvider (Kadıköy seed)
//
// Provider lazy lazy oluşur (import zamanında HTTP fetch tetiklenmez).

import { GooglePlacesProvider } from "./GooglePlacesProvider.js";
import { InMemoryPlacesProvider } from "./InMemoryPlacesProvider.js";
import type { PlacesProvider } from "./PlacesProvider.js";

export type { PlacesProvider, NearbySearchParams, PlaceSummary, PlaceCategory } from "./PlacesProvider.js";
export { ALLOWED_CATEGORIES, mapPrimaryTypeToCategory } from "./PlacesProvider.js";
export { InMemoryPlacesProvider } from "./InMemoryPlacesProvider.js";
export { GooglePlacesProvider } from "./GooglePlacesProvider.js";

export interface PlacesProviderEnv {
  GOOGLE_MAPS_API_KEY?: string;
}

export function buildPlacesProvider(env: PlacesProviderEnv): PlacesProvider {
  if (env.GOOGLE_MAPS_API_KEY) {
    return new GooglePlacesProvider({ apiKey: env.GOOGLE_MAPS_API_KEY });
  }
  return new InMemoryPlacesProvider();
}
