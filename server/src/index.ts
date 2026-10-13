import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDb } from "./db.js";
import { eventsRoutes } from "./events.js";
import { heatmapRoutes } from "./heatmap.js";
import { sessionsRoutes } from "./sessions.js";

const app = new Hono();

// the tracker posts from other domains (my sites), so the API has to allow any origin
app.use("/api/*", cors());

app.use("/api/*", async (c, next) => {
  await connectDb();
  await next();
});

app.get("/health", (c) => c.text("ok"));

app.route("/api/events", eventsRoutes);
app.route("/api", sessionsRoutes);
app.route("/api", heatmapRoutes);

// vercel runs this export directly. locally, dev.ts starts it with node
export default app;
