import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Demo · session-analytics",
  description: "A 75 second walkthrough of session-analytics: tracker, sessions, heatmaps and funnels.",
};

export default function DemoPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Demo</h1>
      <p className="mb-6 text-sm text-neutral-500">
        A 75 second walkthrough: the tracker on a real site, sessions and journeys, heatmaps and funnels.
      </p>

      <video
        src="/demo.mp4"
        poster="/demo-poster.jpg"
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-lg border border-neutral-200 bg-black shadow-sm"
      />

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href="/sessions" className="rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-700">
          Open the live dashboard
        </Link>
        <a
          href="https://github.com/AbhinavMishra32/session-analytics"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 hover:border-neutral-500"
        >
          Source on GitHub
        </a>
      </div>

      <p className="mt-8 text-xs text-neutral-400">
        Voice: ElevenLabs. Music: “Wallpaper” by Kevin MacLeod (incompetech.com), CC BY 4.0.
      </p>
    </>
  );
}
