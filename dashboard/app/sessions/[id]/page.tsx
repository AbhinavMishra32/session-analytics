import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSessionEvents, type TrackedEvent } from "@/lib/api";
import { deviceFor, duration, path } from "@/lib/format";
import { Time } from "../../time";

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  return (
    <>
      <Link href="/sessions" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Sessions
      </Link>
      <Suspense fallback={<p className="mt-6 text-sm text-neutral-500">Loading…</p>}>
        <Journey params={params} />
      </Suspense>
    </>
  );
}

async function Journey({ params }: Pick<PageProps<"/sessions/[id]">, "params">) {
  const { id } = await params;
  const events = await getSessionEvents(id);
  if (events.length === 0) notFound();

  const first = events[0];
  const last = events[events.length - 1];
  const site = new URL(first.page_url).hostname;

  return (
    <>
      <h1 className="mt-4 font-mono text-xl font-semibold">{id}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {site} · <Time value={first.ts} /> · {duration(first.ts, last.ts)} · {events.length} events
      </p>

      <ol className="mt-8 border-l border-neutral-200">
        {events.map((e) => (
          <li key={e._id} className="relative py-2 pl-6">
            <span
              className={`absolute top-3.5 -left-1 h-2 w-2 rounded-full ${
                e.type === "page_view" ? "bg-blue-500" : e.rage ? "bg-red-500" : "bg-neutral-400"
              }`}
            />
            <div className="flex items-baseline gap-3 text-sm">
              <span className="w-14 shrink-0 font-mono text-neutral-400 tabular-nums">
                +{offset(first.ts, e.ts)}
              </span>
              <EventLine event={e} />
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}

function EventLine({ event: e }: { event: TrackedEvent }) {
  if (e.type === "page_view") {
    return (
      <span>
        Viewed <span className="font-mono">{path(e.page_url)}</span>
      </span>
    );
  }

  const heatmap = `/heatmap?url=${encodeURIComponent(e.page_url)}&device=${deviceFor(e.vw ?? 0)}`;
  return (
    <span className="text-neutral-600">
      Clicked at ({e.x}, {e.y}) on{" "}
      <Link href={heatmap} className="font-mono hover:underline">
        {path(e.page_url)}
      </Link>
      {e.rage && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">rage</span>}
    </span>
  );
}

function offset(from: string, to: string) {
  const seconds = Math.round((Date.parse(to) - Date.parse(from)) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
