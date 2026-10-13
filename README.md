# session-analytics

A small session + click analytics tool: a tracking script, an API that stores events in MongoDB, and a dashboard with session journeys and click heatmaps.

**Live dashboard:** https://session-analytics-dashboard-azure.vercel.app
**API:** https://session-analytics-api-lemon.vercel.app

## It's running on my real products

I've used Amplitude and Google Analytics before, but I wanted to see what building the core of one actually takes. So instead of only testing against a demo page, I put the tracker on my own sites:

- [tryspar.dev](https://tryspar.dev) - Spar, a coding practice app I'm building
- [abhinavmishra.in](https://abhinavmishra.in) - my portfolio
- [tryconstruct.cc](https://tryconstruct.cc) - Construct, a learning IDE

So the dashboard shows real visitors, not seeded rows. Building for real sites shaped the design more than the spec did. All three are Next.js apps where navigation never reloads the page, so SPA route changes had to be caught. Visitors arrive on phones and wide monitors, so raw click pixels were useless until they were split by device. And the last click before someone leaves is often the interesting one, so it can't get lost when the tab closes. Seeing my own landing pages through a heatmap has honestly been the most fun part of this.

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

## Data model

One `events` collection:

```
session_id, type ("page_view" | "click"), site, page_url, ts, received_at
click only: x, y (document coords), vw (viewport width), dw, dh (document size), rage
```

Indexes: `{session_id, ts}` for journeys, `{page_url, type}` for heatmaps.

## Decisions and trade-offs

- **Document coordinates, split by device width.** Clicks store `pageX/pageY` plus viewport and document width. A click at 390px wide and one at 1440px wide aren't comparable, so the heatmap buckets by device (mobile < 768, tablet < 1280, desktop) and rescales x by `renderWidth / dw`.
- **Batching + `sendBeacon` over a fetch per event.** Events are queued and flushed every 5s, at 10 events, or when the tab is hidden. `sendBeacon` survives the page closing, so the last clicks before someone leaves aren't lost. The body is `text/plain` so the browser doesn't send a CORS preflight, which `sendBeacon` can't do.
- **Session = 30 minutes idle**, kept in localStorage. Same rule GA uses. A single id forever would merge unrelated visits.
- **Query strings and hashes are stripped** in the tracker and again on the server. `/pricing?utm=x` and `/pricing` are the same page, and URLs can carry tokens or emails.
- **One events collection, sessions computed with an aggregation** instead of a separate sessions collection. It's simpler, and nothing has to be kept in sync. At high volume I'd pre-aggregate sessions on write.
- **Rage clicks detected client side** (3+ clicks within 600ms and 30px). That's where the timing data is. The cost is that the flag is trusted from the client.
- **Heatmap has two modes.** *Live* loads the real page in an iframe, which is current but fails on sites that block framing. *Screenshot* uses Microlink to capture the page at the device width, which works everywhere but is static, and the free tier allows about 50 captures a day.
- **The ingest endpoint is public**, so every batch is validated with Zod (shape, URL protocol, max 100 events) and unknown fields are dropped.

## Out of scope

Dashboard auth, bot filtering, ingest rate limiting, data retention (TTL), scroll depth. Next things I'd add: auth, a TTL index, and pre-aggregated heatmap grids so large pages don't send every click to the browser.
