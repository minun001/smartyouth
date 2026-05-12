# smartyouth QA Checklist

- [ ] Mobile 360px check: dashboard, booth control, help queue, and map fit without horizontal scroll.
- [ ] iPhone Safari check: sticky header, bottom nav, range slider, and textarea work normally.
- [ ] Android Chrome check: large buttons are easy to tap and bottom nav is not blocked by browser chrome.
- [ ] Booth token invalid check: `/booth/[boothNo]` shows read-only status and the QR warning.
- [ ] HQ token valid check: `/hq?t=HQ_TOKEN` can edit all booths and resolve incidents.
- [ ] Booth token cannot edit other booth: token for booth 1 cannot PATCH booth 2.
- [ ] Congestion slider updates correctly and card color reflects the selected level.
- [ ] Help request appears on HQ dashboard and `/help?t=HQ_TOKEN`.
- [ ] Material LOW appears as problem booth.
- [ ] PAUSED appears as problem booth.
- [ ] Booths 42 and 43 are not created.
- [ ] Booth 8 is medical, 40 is exchange, 41 is HQ, and 44 is waiting room.
- [ ] Public `/` stays read-only and does not expose write controls.
- [ ] Supabase service role key is only read by server code.
- [ ] Demo mode works when Supabase env vars are missing.
