import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./index.js";

// on vercel the CDN serves public/ (tracker.js), so only do it here
app.use("/*", serveStatic({ root: "./public" }));

const port = Number(process.env.PORT ?? 4000);
serve({ fetch: app.fetch, port });
console.log(`api listening on :${port}`);
