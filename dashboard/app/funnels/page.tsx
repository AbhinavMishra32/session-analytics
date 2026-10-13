import { Suspense } from "react";
import { getFunnel, getPaths, getSites, type FunnelStep } from "@/lib/api";
import { SiteLink } from "../site-link";

export default function FunnelsPage({ searchParams }: PageProps<"/funnels">) {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">Funnels</h1>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <Funnel searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Funnel({ searchParams }: Pick<PageProps<"/funnels">, "searchParams">) {
  const params = await searchParams;
  const sites = await getSites();

  if (sites.length === 0) {
    return <p className="text-sm text-neutral-500">No data yet.</p>;
  }

  const site = typeof params.site === "string" && sites.includes(params.site) ? params.site : sites[0];
  const paths = await getPaths(site);

  // default to the 3 most viewed pages until steps are picked
  const steps =
    typeof params.steps === "string" && params.steps.trim()
      ? params.steps.split(",").map((s) => s.trim()).filter(Boolean)
      : paths.slice(0, 3).map((p) => p.path);

  const funnel = steps.length >= 2 ? await getFunnel(site, steps) : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {sites.map((s) => (
          <SiteLink key={s} label={s} href={`/funnels?site=${encodeURIComponent(s)}`} active={s === site} />
        ))}
      </div>

      {/* a plain GET form: submitting just puts the steps in the URL */}
      <form action="/funnels" className="mb-2 flex flex-wrap gap-2 text-sm">
        <input type="hidden" name="site" value={site} />
        <input
          name="steps"
          defaultValue={steps.join(", ")}
          placeholder="/, /pricing, /download"
          className="min-w-72 flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 font-mono"
        />
        <button className="rounded-md bg-neutral-900 px-4 py-1.5 text-white hover:bg-neutral-700">Update</button>
      </form>
      <p className="mb-8 text-xs text-neutral-500">
        Pages on {site}: {paths.map((p) => `${p.path} (${p.views})`).join(", ") || "none yet"}
      </p>

      {funnel ? <Steps funnel={funnel} /> : <p className="text-sm text-neutral-500">Add at least 2 steps.</p>}
    </>
  );
}

function Steps({ funnel }: { funnel: FunnelStep[] }) {
  const top = funnel[0].sessions;

  return (
    <ol className="space-y-4">
      {funnel.map((step, i) => {
        const prev = i > 0 ? funnel[i - 1].sessions : null;
        const dropped = prev !== null ? prev - step.sessions : 0;

        return (
          <li key={i}>
            <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
              <span>
                <span className="mr-2 text-neutral-400">{i + 1}.</span>
                <span className="font-mono">{step.path}</span>
              </span>
              <span className="tabular-nums">
                {step.sessions} {step.sessions === 1 ? "session" : "sessions"}
                <span className="ml-2 text-neutral-500">{percent(step.sessions, top)}</span>
              </span>
            </div>
            <div className="h-7 rounded bg-neutral-200">
              <div
                className="h-full rounded bg-blue-500"
                style={{ width: top > 0 ? `${(step.sessions / top) * 100}%` : "0%" }}
              />
            </div>
            {prev !== null && dropped > 0 && (
              <p className="mt-1 text-xs text-red-600">
                −{dropped} dropped off ({percent(dropped, prev)} of step {i})
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function percent(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–";
}
