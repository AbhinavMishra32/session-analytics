import { Hono } from "hono";
import { events } from "./db.js";

const deviceWidths = {
  mobile: { $lt: 768 },
  tablet: { $gte: 768, $lt: 1280 },
  desktop: { $gte: 1280 },
};

export const heatmapRoutes = new Hono();

heatmapRoutes.get("/pages", async (c) => {
  const pages = await events
    .aggregate([
      { $match: { type: "click" } },
      { $group: { _id: "$page_url", clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
    ])
    .toArray();

  return c.json(pages);
});

heatmapRoutes.get("/heatmap", async (c) => {
  const url = c.req.query("url");
  const device = c.req.query("device") as keyof typeof deviceWidths | undefined;

  if (!url) return c.json({ error: "url is required" }, 400);

  const filter: Record<string, unknown> = { page_url: url, type: "click" };
  if (device && deviceWidths[device]) filter.vw = deviceWidths[device];

  const clicks = await events
    .find(filter, { projection: { _id: 0, x: 1, y: 1, vw: 1, dw: 1, dh: 1, rage: 1 } })
    .limit(10000)
    .toArray();

  return c.json(clicks);
});
