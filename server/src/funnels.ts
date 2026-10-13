import { Hono } from "hono";
import { events } from "./db.js";

export const funnelRoutes = new Hono();

// pages of a site with view counts, so the dashboard can suggest funnel steps
funnelRoutes.get("/paths", async (c) => {
  const site = c.req.query("site");
  if (!site) return c.json({ error: "site is required" }, 400);

  const pages = await events
    .aggregate<{ _id: string; views: number }>([
      { $match: { site, type: "page_view" } },
      { $group: { _id: "$page_url", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 50 },
    ])
    .toArray();

  return c.json(pages.map((p) => ({ path: new URL(p._id).pathname, views: p.views })));
});

// ?site=tryspar.dev&steps=/,/pricing,/download
funnelRoutes.get("/funnel", async (c) => {
  const site = c.req.query("site");
  const steps = (c.req.query("steps") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!site) return c.json({ error: "site is required" }, 400);
  if (steps.length < 2 || steps.length > 10) return c.json({ error: "give 2 to 10 steps" }, 400);

  // one row per session: its page views in the order they happened
  const sessions = await events
    .aggregate<{ pages: string[] }>([
      { $match: { site, type: "page_view" } },
      { $sort: { ts: 1 } },
      { $group: { _id: "$session_id", pages: { $push: "$page_url" } } },
    ])
    .toArray();

  // reached[i] = sessions that got to step i, having done steps 0..i-1 before it
  const reached = steps.map(() => 0);

  for (const session of sessions) {
    let next = 0;
    for (const url of session.pages) {
      if (next < steps.length && new URL(url).pathname === steps[next]) {
        reached[next]++;
        next++;
      }
    }
  }

  return c.json(steps.map((path, i) => ({ path, sessions: reached[i] })));
});
