import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDb } from "./db.js";
import { eventsRoutes } from "./events.js";
import { sessionsRoutes } from "./sessions.js";

const app = new Hono();

// the tracker posts from other domains (my sites), so the API has to allow any origin
app.use("/api/*", cors());

app.get("/tracker.js", async (c) => {
  const file = await readFile(join(import.meta.dirname, "../../tracker/tracker.js"), "utf8");
  c.header("Content-Type", "application/javascript");
  c.header("Cache-Control", "public, max-age=300");
  return c.body(file);
});

app.get("/health", (c) => c.text("ok"));

app.route("/api/events", eventsRoutes);
app.route("/api/sessions", sessionsRoutes);

await connectDb();

const port = Number(process.env.PORT ?? 4000);
serve({ fetch: app.fetch, port });
console.log(`api listening on :${port}`);
