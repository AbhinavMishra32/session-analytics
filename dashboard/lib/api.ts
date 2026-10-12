const API_URL = process.env.API_URL ?? "http://localhost:4000";

export type Session = {
  _id: string;
  site: string;
  entry_page: string;
  first_seen: string;
  last_seen: string;
  events: number;
};

export type TrackedEvent = {
  _id: string;
  session_id: string;
  type: "page_view" | "click";
  page_url: string;
  ts: string;
  x?: number;
  y?: number;
  vw?: number;
  rage?: boolean;
};

export type Page = { _id: string; clicks: number };

export type Click = { x: number; y: number; vw: number; dw: number; dh: number; rage: boolean };

export type Device = "desktop" | "tablet" | "mobile";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_URL + path, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
  return res.json();
}

export function getSites() {
  return get<string[]>("/api/sites");
}

export function getSessions(site?: string) {
  return get<Session[]>(site ? `/api/sessions?site=${encodeURIComponent(site)}` : "/api/sessions");
}

export function getSessionEvents(id: string) {
  return get<TrackedEvent[]>(`/api/sessions/${encodeURIComponent(id)}/events`);
}

export function getPages() {
  return get<Page[]>("/api/pages");
}

export function getClicks(url: string, device: Device) {
  return get<Click[]>(`/api/heatmap?url=${encodeURIComponent(url)}&device=${device}`);
}
