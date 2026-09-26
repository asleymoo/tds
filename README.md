# tds

TikTok click-attribution reveal pipeline — see [docs/build-spec.md](docs/build-spec.md) for the full design (reverse-engineered from a HAR capture of an existing implementation, then corrected/deepened across a couple of passes).

**This repo is intentionally standalone.** It does not depend on, import from, or deploy into anything in `~/dev/mabac` or any other project in this account. See "Before you start: isolation" in the build spec before you provision any actual Cloudflare/Apple/ad-platform accounts for this — none of that has been set up yet, on purpose.

## Status

Scaffold only. Nothing deployed. Nothing obfuscated yet. See the build spec's "Execution guide" section for the intended build order — roughly:

1. `shared/` — obfuscation config + sample payloads (done, see below)
2. `lane-1-attribution` → wire up locally, `wrangler dev`, curl-test
3. `bait-page` + its `/session` function → same
4. `lander` → stub
5. `lane-4-container` + `lane-5-reveal` as a pass-through (fake §6 result) before...
6. `lane-3-classify` for real — needs a native iOS host to test against; see the build spec's fork decision before writing this one
7. `lane-2-antitamper`, obfuscation pass, rotation tooling

## Layout

```
tds/
  docs/build-spec.md       # the full design doc
  shared/                  # obfuscator config + build script + test fixtures — build-time only, not runtime-shared
  bait-page/               # CF Pages project: static bait shell + orchestrator + fingerprint collector + /session function
  lander/                  # CF Pages project: destination stub
  lane-1-attribution/      # CF Worker
  lane-2-antitamper/       # CF Worker
  lane-3-classify/         # CF Worker — the one with real decision logic; needs the native app to test the real gate
  lane-4-container/        # CF Worker
  lane-5-reveal/           # CF Worker
```

Each `lane-*`/`bait-page`/`lander` is deployed as its own independent Cloudflare project — nothing here assumes they share a Worker or a deploy pipeline.

## Before deploying anything

- New Cloudflare account, not your MABAC one. `wrangler login` (or a scoped API token) against it before running anything in here.
- Free `*.pages.dev`/`*.workers.dev` subdomains, not a custom domain — see the build spec for why (Certificate Transparency logs).
- Don't reuse production TikTok/Meta ad accounts, Everflow account, or Apple Developer account for this. See the isolation section of the build spec.
