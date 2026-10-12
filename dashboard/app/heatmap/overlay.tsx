"use client";

import { useEffect, useRef, useState } from "react";
import type { Click, Device } from "@/lib/api";

export type Mode = "screenshot" | "live";

// the page is rendered at one fixed width per device, then scaled down to fit the screen
const renderWidth: Record<Device, number> = {
  desktop: 1440,
  tablet: 1024,
  mobile: 390,
};

function screenshotUrl(url: string, width: number) {
  const params = new URLSearchParams({
    url,
    screenshot: "true",
    meta: "false",
    embed: "screenshot.url",
    "viewport.width": String(width),
    "screenshot.fullPage": "true",
  });
  return `https://api.microlink.io/?${params}`;
}

export function Overlay({ url, device, mode, clicks }: { url: string; device: Device; mode: Mode; clicks: Click[] }) {
  const width = renderWidth[device];
  const height = Math.max(900, ...clicks.map((c) => c.dh));

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => setScale(Math.min(1, container.clientWidth / width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={containerRef}>
      <div
        className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white"
        style={{ width: width * scale, height: height * scale }}
      >
        <div className="absolute top-0 left-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
          {mode === "live" ? (
            <iframe src={url} width={width} height={height} className="pointer-events-none" title="page" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={screenshotUrl(url, width)} width={width} alt="" />
          )}

          <svg width={width} height={height} className="absolute inset-0">
            {clicks.map((c, i) => (
              <circle
                key={i}
                // x is stored against the document width at click time, so rescale it to our render width.
                // y is left as-is: at the same layout width, content sits at the same height.
                cx={(c.x * width) / c.dw}
                cy={c.y}
                r={c.rage ? 12 : 9}
                fill={c.rage ? "rgb(220 38 38 / 0.6)" : "rgb(234 88 12 / 0.35)"}
                stroke={c.rage ? "rgb(220 38 38)" : "none"}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
