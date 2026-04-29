// Açılış saatleri görselleştirme — Türkçe gün adları, "Bugün açık/kapalı" badge.
// Google'ın `weekdayDescriptions` zaten Türkçe geliyor (locale=tr ile fetch
// ettiğimiz için); biz sadece bugünü vurguluyoruz + openNow durumunu
// gösteriyoruz.

import { useState } from "react";
import type { OpeningHours } from "./types";

const TURKISH_DAYS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

export function OpeningHoursView({ hours }: { hours: OpeningHours }) {
  const [expanded, setExpanded] = useState(false);
  const todayDow = new Date().getDay(); // 0=Sunday … 6=Saturday
  // Google's weekdayDescriptions are ordered Monday-first; remap to JS index.
  // Position of today in the description array:
  const todayIndex = todayDow === 0 ? 6 : todayDow - 1;
  const todayLabel = hours.weekdayDescriptions[todayIndex];
  const isOpen = hours.openNow ?? null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {isOpen === true && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
            ● Açık
          </span>
        )}
        {isOpen === false && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs font-medium">
            ● Kapalı
          </span>
        )}
        {todayLabel && (
          <span className="text-xs text-slate-600">{todayLabel}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-brand-600 hover:underline"
      >
        {expanded ? "Haftalık tabloyu gizle" : "Haftalık tabloyu göster"}
      </button>

      {expanded && hours.weekdayDescriptions.length > 0 && (
        <table className="mt-2 w-full text-xs border-collapse">
          <tbody>
            {hours.weekdayDescriptions.map((line, idx) => (
              <tr
                key={idx}
                className={
                  idx === todayIndex
                    ? "bg-brand-50/80 font-medium text-brand-800"
                    : "text-slate-600"
                }
              >
                <td className="py-1 pr-3 align-top whitespace-nowrap">
                  {dayFromDescription(line) ?? TURKISH_DAYS[(idx + 1) % 7]}
                </td>
                <td className="py-1 align-top">{stripDay(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function dayFromDescription(line: string): string | null {
  const m = line.match(/^([^:]+):/);
  return m ? m[1]!.trim() : null;
}
function stripDay(line: string): string {
  const i = line.indexOf(":");
  return i === -1 ? line : line.slice(i + 1).trim();
}
