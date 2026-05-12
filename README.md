# smartyouth

Mobile-first booth operations tool for the 2026 Asan Youth Festa. It has no normal account login: HQ and booth staff use tokenized edit links, usually opened from QR codes.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If Supabase env vars are missing, the app runs in demo mode with in-memory data.

## Environment

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_REALTIME_URL=
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
HQ_TOKEN=...
BOOTH_TOKEN_SECRET=...
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by server route handlers. Do not expose it in browser code.

## Supabase Schema

Run `supabase/schema.sql` in the Supabase SQL editor. It creates:

- `booths`
- `booth_statuses`
- `booth_status_logs`
- `incidents`

The schema seeds booth numbers `1-41` and `44` only.

## Generate Booth QR Links

```bash
npm run generate:booth-links
```

Use the printed `/booth/[boothNo]?t=...` URLs to create QR codes for booth staff. Use `/hq?t=HQ_TOKEN` for operations HQ and `/help?t=HQ_TOKEN` for the help queue.

## Map Image

Place the booth layout image at:

```text
public/booth-map.png
```

If the file is missing, `/map` shows a clear placeholder. If booth `x` and `y` values are added later, pins will render on top of the image.

## Cloudflare Realtime Backend

For the GitHub Pages production version, use Cloudflare Workers + D1 + WebSocket. GitHub Pages serves the screen, while Cloudflare stores booth status and broadcasts change signals only when data changes.

1. Log in to Cloudflare:

```bash
npx wrangler login
```

2. Create the D1 database:

```bash
npm run worker:d1:create
```

3. Copy the printed database id into `wrangler.toml`:

```toml
database_id = "..."
```

4. Add Worker secrets:

```bash
npx wrangler secret put HQ_TOKEN
npx wrangler secret put BOOTH_TOKEN_SECRET
```

5. Apply the schema and seed booths:

```bash
npm run worker:d1:apply
```

6. Deploy the Worker:

```bash
npm run worker:deploy
```

7. Set GitHub repository secrets:

```text
NEXT_PUBLIC_API_BASE_URL=https://smartyouth-api.<your-subdomain>.workers.dev
NEXT_PUBLIC_REALTIME_URL=wss://smartyouth-api.<your-subdomain>.workers.dev/ws
```

After these secrets are set, the GitHub Pages workflow builds the real shared-data version instead of local demo mode.

For 40-100 event-day users, the app opens one WebSocket per active browser. A status change writes to D1 once and broadcasts a small signal, then connected screens refresh. If WebSocket is unavailable, screens fall back to a 30-second refresh.

## Deploy

For real event operations on GitHub Pages, deploy the Cloudflare backend first. GitHub Pages is static hosting, so it cannot run Next.js route handlers by itself. This repo includes a GitHub Pages workflow that can either:

- build demo mode when `NEXT_PUBLIC_API_BASE_URL` is missing
- build the real Cloudflare-backed version when `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_REALTIME_URL` are set

```text
https://minun001.github.io/smartyouth
```

Static demo tokens:

```text
HQ demo: /hq?t=demo-hq
Booth 1 demo: /booth/1?t=demo-booth-1
```

Use demo mode only for preview. Use the Cloudflare backend above for real event-day shared status.

To reproduce the GitHub Pages build locally:

```bash
npm run typecheck
npm test
npm run build:pages
```

`npm run build:pages` temporarily disables server API routes for static export and restores them after the build.

## Event Day Use

1. Apply the Supabase schema and confirm booth seed data.
2. Set `HQ_TOKEN` and a long random `BOOTH_TOKEN_SECRET`.
3. Run `npm run generate:booth-links`.
4. Print or distribute booth QR codes.
5. HQ monitors `/hq?t=HQ_TOKEN` and `/help?t=HQ_TOKEN`.
6. Booth staff update status from their booth QR page.
7. Public read-only status is available at `/`.

## Shared Status Updates

Booth staff and HQ can change operation status and congestion from large buttons on the booth control panel. Each change is saved through the server API, then public dashboards, HQ, map, help, and booth screens refresh every 5 seconds so other people can see the updated value.

For this to be shared across phones on GitHub Pages, configure the Cloudflare backend. GitHub Pages static demo mode stores changes in each browser only, so it is useful for preview but not for real shared operations.
