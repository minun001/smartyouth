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

## Deploy

For real event operations, deploy as a standard Next.js App Router project on a host that supports server route handlers, such as Vercel or Netlify Functions. Set the same environment variables in the hosting platform. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

GitHub Pages is static hosting, so it cannot run the secure server token verification or Supabase service-role route handlers. This repo includes a GitHub Pages workflow that deploys a static demo to:

```text
https://minun001.github.io/smartyouth
```

Static demo tokens:

```text
HQ demo: /hq?t=demo-hq
Booth 1 demo: /booth/1?t=demo-booth-1
```

Use the GitHub Pages build only for preview/demo. Do not use it as the real event-day operations backend.

## Event Day Use

1. Apply the Supabase schema and confirm booth seed data.
2. Set `HQ_TOKEN` and a long random `BOOTH_TOKEN_SECRET`.
3. Run `npm run generate:booth-links`.
4. Print or distribute booth QR codes.
5. HQ monitors `/hq?t=HQ_TOKEN` and `/help?t=HQ_TOKEN`.
6. Booth staff update status from their booth QR page.
7. Public read-only status is available at `/`.

## Shared Status Updates

Booth staff and HQ can change operation status and congestion from large buttons on the booth control panel. Each change is saved through the server API, then public dashboards, HQ, map, help, and booth screens refresh every 2 seconds so other people can see the updated value.

For this to be shared across phones, run the app on a server-capable Next.js host with Supabase env vars configured. GitHub Pages static demo mode stores changes in each browser only, so it is useful for preview but not for real shared operations.
