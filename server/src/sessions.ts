import { Hono } from "hono";
import { events } from "./db.js";

export const sessionsRoutes = new Hono();

sessionsRoutes.get("/sites", async (c) => {
  const sites = await events.distinct("site");
  return c.json(sites.sort());
});

sessionsRoutes.get("/sessions", async (c) => {
  const site = c.req.query("site");
  const filter = site ? { site } : {};

  const sessions = await events
    .aggregate([
      { $match: filter },
      { $sort: { ts: 1 } },
      {
        $group: {
          _id: "$session_id",
          site: { $first: "$site" },
          entry_page: { $first: "$page_url" },
          first_seen: { $first: "$ts" },
          last_seen: { $last: "$ts" },
          events: { $sum: 1 },
        },
      },
      { $sort: { last_seen: -1 } },
      { $limit: 200 },
    ])
    .toArray();

  return c.json(sessions);
});

sessionsRoutes.get("/sessions/:id/events", async (c) => {
  const list = await events
    .find({ session_id: c.req.param("id") })
    .sort({ ts: 1 })
    .toArray();

  return c.json(list);
});
