# smartyouth Sub-Agent Plan

## Main Coordinator Agent
- Owns the Next.js App Router architecture, shared types, API surface, and final integration.
- Keeps the MVP intentionally small: public dashboard, HQ controls, booth controls, map, and help queue.
- Verifies consistency across Korean UI labels, mobile layout, route behavior, and demo/Supabase modes.

## Mobile UX Agent
- Designs the phone-first shell with a sticky header, bottom navigation, large segmented buttons, and card-based lists.
- Keeps labels short and operational: 상황, 내 부스, 지도, 도움, 저장됨, 수정 권한 없음.
- Ensures touch targets are at least 44px and the app remains usable at 360px width.

## Booth Data Agent
- Creates deterministic booth seed data for booth numbers 1-41 and 44 only.
- Does not create booths 42 or 43.
- Marks special types: 8 medical, 9 rest, 40 exchange, 41 hq, 44 waiting; all others experience.

## No-Login Access Agent
- Implements token-based write permissions with server-side verification only.
- Supports HQ token for all booths and HMAC booth tokens for individual booth edit links.
- Ensures no username/password login or browser-exposed service role key exists.

## Status Workflow Agent
- Implements operation status, congestion, wait time, material status, memo, and help request workflows.
- Uses immediate updates with optimistic UI and clear save/error feedback.
- Creates incidents when staff request help.

## Dashboard Agent
- Builds the public read-only overview and editable HQ dashboard.
- Sorts problem booths first and highlights congestion, low materials, paused booths, open help, and stale updates.
- Adds summary cards, filters, refresh, polling, and recent change visibility for HQ.

## Booth Control Agent
- Builds the individual booth control page at `/booth/[boothNo]?t=BOOTH_TOKEN`.
- Shows read-only status with a warning when the token is missing or invalid.
- Makes one-tap status, wait time, material, and help request updates simple for booth staff.

## Map Agent
- Builds `/map` with `public/booth-map.png` support.
- Shows the map image when present; if coordinates are unavailable, lists problem booths below.
- Shows a clear placeholder message when the map image is missing.

## QA Agent
- Creates a QA checklist for mobile usability, token safety, and booth data consistency.
- Adds minimal automated tests for token generation, booth data, and problem-booth logic.
- Runs lint/build/test checks where available.
