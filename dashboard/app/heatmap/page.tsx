import Link from "next/link";
import { Suspense } from "react";
import { getClicks, getPages, type Device } from "@/lib/api";
import { Overlay, type Mode } from "./overlay";
import { PagePicker } from "./page-picker";

const devices: Device[] = ["desktop", "tablet", "mobile"];
const modes: Mode[] = ["screenshot", "live"];

export default function HeatmapPage({ searchParams }: PageProps<"/heatmap">) {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">Heatmap</h1>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <Heatmap searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Heatmap({ searchParams }: Pick<PageProps<"/heatmap">, "searchParams">) {
  const params = await searchParams;
  const pages = await getPages();

  if (pages.length === 0) {
    return <p className="text-sm text-neutral-500">No clicks recorded yet.</p>;
  }

  const url = typeof params.url === "string" ? params.url : pages[0]._id;
  const device = devices.find((d) => d === params.device) ?? "desktop";
  const mode = modes.find((m) => m === params.mode) ?? "screenshot";

  const clicks = await getClicks(url, device);
  const rageCount = clicks.filter((c) => c.rage).length;

  const link = (change: Record<string, string>) =>
    "/heatmap?" + new URLSearchParams({ url, device, mode, ...change }).toString();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <PagePicker pages={pages} selected={url} />
        <Toggle options={devices} active={device} href={(d) => link({ device: d })} />
        <Toggle options={modes} active={mode} href={(m) => link({ mode: m })} />
        <span className="text-neutral-500">
          {clicks.length} clicks
          {rageCount > 0 && <span className="text-red-600"> · {rageCount} rage</span>}
        </span>
      </div>

      {mode === "live" && (
        <p className="mb-3 text-xs text-neutral-500">
          Live mode frames the page directly. Sites that send X-Frame-Options or a strict frame-ancestors
          will show blank — use screenshot mode for those.
        </p>
      )}

      <Overlay url={url} device={device} mode={mode} clicks={clicks} />
    </>
  );
}

function Toggle<T extends string>({ options, active, href }: { options: T[]; active: T; href: (o: T) => string }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-neutral-300 bg-white">
      {options.map((o) => (
        <Link
          key={o}
          href={href(o)}
          className={`px-3 py-1 capitalize ${o === active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
        >
          {o}
        </Link>
      ))}
    </div>
  );
}
