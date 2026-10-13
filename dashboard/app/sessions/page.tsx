import Link from "next/link";
import { Suspense } from "react";
import { getSessions, getSites } from "@/lib/api";
import { duration, path } from "@/lib/format";
import { SiteLink } from "../site-link";
import { Time } from "../time";

export default function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">Sessions</h1>
      <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
        <SessionsTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SessionsTable({ searchParams }: Pick<PageProps<"/sessions">, "searchParams">) {
  const { site } = await searchParams;
  const selected = typeof site === "string" ? site : undefined;
  const [sites, sessions] = await Promise.all([getSites(), getSessions(selected)]);

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <SiteLink label="All sites" href="/sessions" active={!selected} />
        {sites.map((s) => (
          <SiteLink key={s} label={s} href={`/sessions?site=${encodeURIComponent(s)}`} active={s === selected} />
        ))}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-neutral-500">No sessions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Session</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Entry page</th>
                <th className="px-4 py-2 text-right font-medium">Events</th>
                <th className="px-4 py-2 text-right font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Started</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/sessions/${s._id}`} className="text-blue-600 hover:underline">
                      {s._id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{s.site}</td>
                  <td className="px-4 py-2 font-mono text-neutral-600">{path(s.entry_page)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{s.events}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{duration(s.first_seen, s.last_seen)}</td>
                  <td className="px-4 py-2 text-neutral-600">
                    <Time value={s.first_seen} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
