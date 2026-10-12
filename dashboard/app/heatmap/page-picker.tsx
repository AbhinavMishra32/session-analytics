"use client";

import { useRouter } from "next/navigation";
import type { Page } from "@/lib/api";

export function PagePicker({ pages, selected }: { pages: Page[]; selected: string }) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => router.push(`/heatmap?url=${encodeURIComponent(e.target.value)}`)}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1 font-mono"
    >
      {pages.map((p) => (
        <option key={p._id} value={p._id}>
          {p._id} ({p.clicks})
        </option>
      ))}
    </select>
  );
}
