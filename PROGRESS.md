# Progress

Tracks the 9 steps from `docs/build-spec.md`'s "Execution guide — how to actually build this" section (the numbered "Concrete step order" + step 9 appended after it). Update this in the same PR as the work it describes — that's the point of the file.

| # | Step (per build-spec.md) | Status | Notes | PR |
|---|---|---|---|---|
| 1 | §3 fingerprint collector | Scaffolded, not independently verified | Lives in `bait-page/public/index.html` (`collectRiskTelemetry`), including the global-surface dump. It's client-side only, so "test standalone" means loading the page in a real browser and reading `console`/network tab — not yet done. | Initial scaffold (direct to `main`, pre-dates this file) |
| 2 | §1/§2 bait shell + §9 `/session` | **Done, verified locally** | `wrangler pages dev public` served the static shell (200, correct `<title>`) and `POST /session` returned real random decoy JSON via the Pages Function. | Initial scaffold; this PR (local verification) |
| 3 | Native Xcode host | **Done, verified end-to-end** | `xcodegen generate` + Xcode 27 build succeeded. Ran in iPhone 18 Pro simulator against local bait-page + all 5 lane Workers (`wrangler dev` on ports 8791–8795). Full pipeline executed: globals injected at document start, lane-3 `classify()` passed (bridge present, `isIOS`/`detectedAdConnection`/`session` all correct), lane-5 called `openContainer()`, both `init` and `open` postMessages landed in the Swift `WKScriptMessageHandler` with correct attribution context and session ID. Destination URL is still `REPLACE-lander.pages.dev` (not deployed yet). | This PR |
| 4 | §4 attribution lane | **Done, verified locally** | `wrangler dev` + curl against `shared/sample-payloads/deliver-request.json` returned the expected `ttclid`/`utm_*`/`BHlander` declarations. CORS also verified: origin reflected when allowed, blanked for a random origin. | Initial scaffold; verified in an earlier session |
| 5 | §10 destination lander | **Done, verified locally** | `wrangler pages dev public --port 8799` served the stub. Confirmed it correctly reads `sessionId` and `ttclid`/`utm_*` fallback attribution from query params. Real destination content still a placeholder per §10. | This session |
| 6 | §7 (messenger) + §8 (reveal) as a pass-through | **Diverges from the doc's recommended order** | The doc recommends hardcoding `classify()` to always pass first, to test wiring independent of gating logic. What's scaffolded instead is the *real* `classify()`/`openContainer()` logic directly in lane-3/lane-4 — so the full pipeline can't actually be exercised end-to-end yet, because lane-3's real gate requires a native bridge that doesn't exist without step 3. Worth revisiting: either add a temporary pass-through flag to lane-3, or accept that full end-to-end testing waits on the native host. | Initial scaffold |
| 7 | §6 classification, real version | Scaffolded, still untestable | `lane-3-classify` implements the `window.webkit.messageHandlers.*` check + `session`/`detectedAdConnection`/`isIOS` reads, guarded with `typeof` so it doesn't throw outside a native context. Correctly returns `false` in any plain-browser test — that's expected, not a bug. Step 3's native host now exists as a scaffold too, but since it's never been built/run, this is still un-exercised end-to-end. | Initial scaffold |
| 8 | §5 anti-tamper + §11 obfuscation/rotation | **Done** | All 5 lanes built through `shared/build-lane.mjs` → `dist/worker.js` (esbuild bundle → javascript-obfuscator). `shared/obfuscator.config.json` fixed: `debugProtectionInterval: 0` (non-zero blocks Miniflare event loop; `selfDefending` also self-triggers in Miniflare — obfuscated builds are production-only). Lane-2-antitamper logic verified. Rotation script: `shared/rotate.mjs` — generates 5 new random Worker names, deploys each lane under the new name via temp wrangler.jsonc, updates bait page LANES array, redeploys bait page, deletes old Workers. Run: `node shared/rotate.mjs` (or `--dry-run`). | This session |
| 9 | §12 observability + kill switch | **Done** | Kill switch verified: flipped `KILL_SWITCH = true`, loaded bait page in browser — only `GET /` fired, zero `/session` or lane requests. Flipped back. Observability wired: `env.ANALYTICS?.writeDataPoint()` added to `/session` (logs sessionRef + IP + country on visit start) and all 5 lane Workers (logs `lane-N-arrived` + sessionRef + country on each stage arrival). `analytics_engine_datasets` binding (`tds_events`) added to all 5 `wrangler.jsonc` files — gracefully absent locally, active on `wrangler deploy`. §6 gate outcome (bridge missing / classify passed / etc.) is a client-side decision and can't be logged server-side without a callback endpoint; lane-5-reveal arrival is a reasonable proxy for "pipeline completed". | This session |

## Deployed

Cloudflare account `largemuffler235@gmail.com` (`d1d841219cfc53f4f516af49e3ac8c6e`), workers.dev subdomain `t9k2x8mq`.
Lander Pages project (`tds-lander-1dg`) lives in the same largemuffler account — deploy with `CLOUDFLARE_ACCOUNT_ID=d1d841219cfc53f4f516af49e3ac8c6e`.

| Resource | URL | Account |
|---|---|---|
| Edge proxy (rwdgames.site) | rwdgames.site → reverse-proxies to tds-bait.pages.dev | largemuffler (`d1d8…`) |
| Bait page (blank shell) | https://tds-bait.pages.dev | largemuffler (`d1d8…`) |
| Lander (Sparkling overlay) | https://tds-lander-1dg.pages.dev | largemuffler (`d1d8…`) |
| Lane 1 (attribution) | https://tds-lane-1-attribution.t9k2x8mq.workers.dev | largemuffler (`d1d8…`) |
| Lane 2 (antitamper) | https://tds-lane-2-antitamper.t9k2x8mq.workers.dev | largemuffler (`d1d8…`) |
| Lane 3 (classify) | https://tds-lane-3-classify.t9k2x8mq.workers.dev | largemuffler (`d1d8…`) |
| Lane 4 (container) | https://tds-lane-4-container.t9k2x8mq.workers.dev | largemuffler (`d1d8…`) |
| Lane 5 (reveal) | https://tds-lane-5-reveal.t9k2x8mq.workers.dev | largemuffler (`d1d8…`) |

End-to-end browser verification against production URLs: `GET /` → 200, `POST /session` → 200, all 5 lane scripts fetched and injected. Lane-2 logged referrer/medium check, lane-3 classify() returned false (no native bridge — expected in plain browser), pipeline exited cleanly. Analytics Engine (`TDS_ANALYTICS` → `tds_analytics` dataset) active on all lane Workers.

### Lander update (2026-09-30)

Replaced the single-CTA "Claim Your Spot" lander with a 5-screen multi-step funnel:
1. Age confirmation
2. Birth year selector
3. Congratulations / eligibility
4. Final Steps (Install → Sign Up → Complete Setup)
5. Spinner + fake TikTok push notification → tapping the notification navigates to the tracking link with `ttclid`/`sub5` passthrough

Lane-1 `LANDER_URL` updated to `https://tds-lander-1dg.pages.dev/` and redeployed.

Offer links (50/50 random split at page load):
- `https://www.stw4c9hx.com/7BZ2W/L1B1F8/`
- `https://www.stw4c9hx.com/7BZ2W/25N5614/`

Campaigns live as of 2026-09-30.

## Remaining

- **Ad account + Apple Developer account** isolation steps from "Before you start: isolation" in build-spec.md — separate from production.
- **Subdomain rotation cadence**: `shared/rotate.mjs` is ready; run it on whatever schedule you choose (weekly, per-campaign, etc.).
