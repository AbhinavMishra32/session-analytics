import type { Device } from "./api";

// same breakpoints as the API (server/src/heatmap.ts)
export function deviceFor(vw: number): Device {
  if (vw < 768) return "mobile";
  if (vw < 1280) return "tablet";
  return "desktop";
}

export function path(url: string) {
  return new URL(url).pathname;
}

export function duration(from: string, to: string) {
  const seconds = Math.round((Date.parse(to) - Date.parse(from)) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
