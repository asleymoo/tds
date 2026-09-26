# Progress

Tracks the 9 steps from `docs/build-spec.md`'s "Execution guide — how to actually build this" section (the numbered "Concrete step order" + step 9 appended after it). Update this in the same PR as the work it describes — that's the point of the file.

| # | Step (per build-spec.md) | Status | Notes | PR |
|---|---|---|---|---|
| 1 | §3 fingerprint collector | Scaffolded, not independently verified | Lives in `bait-page/public/index.html` (`collectRiskTelemetry`), including the global-surface dump. It's client-side only, so "test standalone" means loading the page in a real browser and reading `console`/network tab — not yet done. | Initial scaffold (direct to `main`, pre-dates this file) |
| 2 | §1/§2 bait shell + §9 `/session` | **Done, verified locally** | `wrangler pages dev public` served the static shell (200, correct `<title>`) and `POST /session` returned real random decoy JSON via the Pages Function. | Initial scaffold; this PR (local verification) |
| 3 | Native Xcode host | Not started | Separate repo/track — nothing here yet. Needed before §6/§7 can be tested for real. | — |
| 4 | §4 attribution lane | **Done, verified locally** | `wrangler dev` + curl against `shared/sample-payloads/deliver-request.json` returned the expected `ttclid`/`utm_*`/`BHlander` declarations. CORS also verified: origin reflected when allowed, blanked for a random origin. | Initial scaffold; verified in an earlier session |
| 5 | §10 destination lander | Scaffolded, not tested | `lander/public/index.html` stub exists (reads `sessionId` + query-string fallback attribution). Not yet run locally. | Initial scaffold |
| 6 | §7 (messenger) + §8 (reveal) as a pass-through | **Diverges from the doc's recommended order** | The doc recommends hardcoding `classify()` to always pass first, to test wiring independent of gating logic. What's scaffolded instead is the *real* `classify()`/`openContainer()` logic directly in lane-3/lane-4 — so the full pipeline can't actually be exercised end-to-end yet, because lane-3's real gate requires a native bridge that doesn't exist without step 3. Worth revisiting: either add a temporary pass-through flag to lane-3, or accept that full end-to-end testing waits on the native host. | Initial scaffold |
| 7 | §6 classification, real version | Scaffolded, untestable without step 3 | `lane-3-classify` implements the `window.webkit.messageHandlers.*` check + `session`/`detectedAdConnection`/`isIOS` reads, guarded with `typeof` so it doesn't throw outside a native context. Correctly returns `false` in any plain-browser test — that's expected, not a bug. | Initial scaffold |
| 8 | §5 anti-tamper + §11 obfuscation/rotation | Partially scaffolded | `lane-2-antitamper` has the simplified referrer/medium check (see build-spec.md §5's correction — it's not session-minting). `shared/obfuscator.config.json` + `shared/build-lane.mjs` exist but have never been run against a real bundle. Rotation tooling (spin up new lane subdomain, retire old) not started. | Initial scaffold |
| 9 | §12 observability + kill switch | Partially done | `KILL_SWITCH` const exists in `bait-page/public/index.html` (untested — flipping it and confirming the pipeline goes inert hasn't been done). No logging/observability wired up yet (Workers Analytics Engine or Logpush per §12). | Initial scaffold |

## Not yet started at all

- Cloudflare account setup / `wrangler login` against the isolated account (nothing has been deployed anywhere)
- Ad account, Everflow sub-account, Apple Developer account isolation steps from "Before you start: isolation" in build-spec.md
- Domain/subdomain rotation scripting (§11)
