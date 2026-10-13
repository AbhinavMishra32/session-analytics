# session-analytics

A small session + click analytics tool: a tracking script, an API that stores events in MongoDB, and a dashboard with session journeys, click heatmaps and funnels.

**Demo video (75s):** https://session-analytics-dashboard-azure.vercel.app/demo
**Live dashboard:** https://session-analytics-dashboard-azure.vercel.app
**API:** https://session-analytics-api-lemon.vercel.app

## It's running on my real products

I've used Amplitude and Google Analytics before, but I wanted to see what building the core of one actually takes. So instead of only testing against a demo page, I put the tracker on my own sites:

- [tryspar.dev](https://tryspar.dev) - Spar, a coding practice app I'm building
- [abhinavmishra.in](https://abhinavmishra.in) - my portfolio

So the dashboard shows real visitors, not seeded rows. Building for real sites shaped the design more than the spec did. Both are Next.js apps where navigation never reloads the page, so SPA route changes had to be caught. Visitors arrive on phones and wide monitors, so raw click pixels were useless until they were split by device. And the last click before someone leaves is often the interesting one, so it can't get lost when the tab closes. Seeing my own landing pages through a heatmap has honestly been the most fun part of this. Within an hour of going live it caught a real visitor rage-clicking the hero buttons on tryspar.dev, four rage clicks in under ten seconds. That's exactly the kind of thing I built it to find.

One script tag adds a site:

```html
<script src="https://session-analytics-api-lemon.vercel.app/tracker.js" defer></script>
```

## Stack

| Part      | Choice                         |
|-----------|--------------------------------|
| Tracker   | Plain JS, one file, no build   |
| API       | Hono + TypeScript, Zod         |
| Database  | MongoDB (official driver)      |
| Dashboard | Next.js (App Router) + Tailwind|
| Hosting   | Vercel (API + dashboard), MongoDB Atlas |

## Setup

Needs Node 22+, pnpm, and either Docker or a MongoDB URI.

```bash
# 1. database (or put an Atlas URI in server/.env.local)
docker compose up -d

# 2. api on :4000
cd server
cp .env.example .env.local
pnpm install
pnpm dev

# 3. dashboard on :3000
cd ../dashboard
pnpm install
pnpm dev        # API_URL defaults to http://localhost:4000
```

To generate events locally, add `<script src="http://localhost:4000/tracker.js" defer></script>` to any page served on another port and click around.

## Layout

```
server/public/tracker.js   the tracking script (served by the API)
server/src/                Hono API
dashboard/                 Next.js dashboard
```

## API

| Method | Path                         | What it returns |
|--------|------------------------------|-----------------|
| POST   | `/api/events`                | stores a batch of events |
| GET    | `/api/sites`                 | distinct sites |
| GET    | `/api/sessions?site=`        | sessions with event count, entry page, first/last seen |
| GET    | `/api/sessions/:id/events`   | one session's events in order |
| GET    | `/api/pages`                 | pages that have clicks, most clicked first |
| GET    | `/api/heatmap?url=&device=`  | clicks for a page, filtered by device width |
| GET    | `/api/paths?site=`           | a site's pages with view counts |
| GET    | `/api/funnel?site=&steps=`   | sessions reaching each step, in order |

## Data model

One `events` collection:

```
session_id, type ("page_view" | "click"), site, page_url, ts, received_at
click only: x, y (document coords), vw (viewport width), dw, dh (document size), rage
```

Indexes: `{session_id, ts}` for journeys, `{page_url, type}` for heatmaps.

## Going further: funnels

With everything in the brief working and deployed, I was ready to submit. But a list of sessions and a heatmap still don't answer the question a product owner actually has: **where am I losing people?** So I pushed one step further and added funnels.

Pick a site, list the steps as paths (`/, /pricing, /download`), and the dashboard shows how many sessions reached each step and how many dropped off between steps. A step only counts if the visitor reached it **after** the previous one, so `/pricing → /` isn't the same funnel as `/ → /pricing`.

It runs on the same `events` collection, so the tracker didn't change. MongoDB groups each session's page views in time order, then a short loop walks every session through the steps. This is the view I actually wanted for my own landing pages.

## Assumptions

- **One browser = one visitor.** The session id lives in localStorage, so a different browser, device or cleared storage counts as a new visitor. There's no cross-device identity.
- **Client time orders a session.** Events are sorted by the browser's `ts`. The server also stores `received_at`, so a badly skewed client clock can be spotted.
- **A page is origin + path.** Query strings and hashes are ignored, so `/pricing?utm=x` and `/pricing` are one page.
- **Layouts are stable within a device bucket.** Heatmaps assume a page looks the same at, say, 1300px and 1440px wide, and that the page hasn't changed much since the clicks happened (the screenshot is of the page as it is now).
- **The dashboard is for the site owner.** It has no login. Anyone with the URL can read it, which is fine for a demo but not for real customer data.
- **Pages are public.** Screenshot mode needs to load the page from outside, so it doesn't work for pages behind a login.

## Decisions and trade-offs

- **Document coordinates, split by device width.** Clicks store `pageX/pageY` plus viewport and document width. A click at 390px wide and one at 1440px wide aren't comparable, so the heatmap buckets by device (mobile < 768, tablet < 1280, desktop) and rescales x by `renderWidth / dw`.
- **Batching + `sendBeacon` over a fetch per event.** Events are queued and flushed every 5s, at 10 events, or when the tab is hidden. `sendBeacon` survives the page closing, so the last clicks before someone leaves aren't lost. The body is `text/plain` so the browser doesn't send a CORS preflight, which `sendBeacon` can't do.
- **Session = 30 minutes idle**, kept in localStorage. Same rule GA uses. A single id forever would merge unrelated visits.
- **Query strings and hashes are stripped** in the tracker and again on the server. `/pricing?utm=x` and `/pricing` are the same page, and URLs can carry tokens or emails.
- **One events collection, sessions computed with an aggregation** instead of a separate sessions collection. It's simpler, and nothing has to be kept in sync. At high volume I'd pre-aggregate sessions on write.
- **Rage clicks detected client side** (3+ clicks within 600ms and 30px). That's where the timing data is. The cost is that the flag is trusted from the client.
- **Heatmap has two modes.** *Live* loads the real page in an iframe, which is current but fails on sites that block framing. *Screenshot* uses Microlink to capture the page at the device width, which works everywhere but is static, and the free tier allows about 50 captures a day.
- **Funnels computed at read time.** Mongo groups page views per session and the step matching happens in a small loop in the API. That's simple and fast at this size. With millions of sessions I'd do the step matching inside the aggregation, or precompute per-session paths.
- **The ingest endpoint is public**, so every batch is validated with Zod (shape, URL protocol, max 100 events) and unknown fields are dropped.

## Out of scope

Dashboard auth, bot filtering, ingest rate limiting, data retention (TTL), scroll depth. Next things I'd add: auth, a TTL index, and pre-aggregated heatmap grids so large pages don't send every click to the browser.
