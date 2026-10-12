import { Hono } from "hono";
import { z } from "zod";
import { events, type Event } from "./db.js";

const base = {
  session_id: z.string().min(1).max(100),
  page_url: z.url({ protocol: /^https?$/ }).max(2000),
  ts: z.number(),
};

const pageView = z.object({
  ...base,
  type: z.literal("page_view"),
});

const click = z.object({
  ...base,
  type: z.literal("click"),
  x: z.number(),
  y: z.number(),
  vw: z.number(),
  dw: z.number(),
  dh: z.number(),
  rage: z.boolean(),
});

const batch = z.object({
  events: z.array(z.discriminatedUnion("type", [pageView, click])).min(1).max(100),
});

export const eventsRoutes = new Hono();

eventsRoutes.post("/", async (c) => {
  // tracker sends text/plain so parse the body here
  let body;
  try {
    body = JSON.parse(await c.req.text());
  } catch {
    return c.json({ error: "invalid json" }, 400);
  }

  const parsed = batch.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid events" }, 400);
  }

  const receivedAt = new Date();

  const docs: Event[] = parsed.data.events.map((e) => {
    const url = new URL(e.page_url);
    return {
      ...e,
      site: url.hostname,
      // tracker already strips query/hash, but this endpoint is public so don't trust it
      page_url: url.origin + url.pathname,
      ts: new Date(e.ts),
      received_at: receivedAt,
    };
  });

  await events.insertMany(docs);
  return c.body(null, 204);
});
