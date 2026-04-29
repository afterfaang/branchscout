// Sprint 4 frontend types — Place Details panel.

import type { PlaceCategory, PlaceSummary } from "../map/types";

export interface PlacePhoto {
  reference: string;
  widthPx: number | null;
  heightPx: number | null;
  url?: string | null;
  authorAttributions?: { displayName: string; uri?: string | null }[];
}

export interface OpeningHoursPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface OpeningHours {
  weekdayDescriptions: string[];
  periods: OpeningHoursPeriod[];
  openNow: boolean | null;
}

export interface PlaceDetail extends PlaceSummary {
  phone: string | null;
  websiteUri: string | null;
  hours: OpeningHours | null;
  photos: PlacePhoto[];
}

export interface PlaceDetailResponse {
  data: PlaceDetail;
  meta: {
    source: "db" | "cache" | "api";
    lastEnrichedAt: string | null;
    provider: string;
  };
}

export type { PlaceCategory };
