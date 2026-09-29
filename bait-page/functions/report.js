// Cloudflare Pages Function — /report endpoint.
// Called by lane-5's delivered script (same-origin, runs in bait-page context)
// after the pipeline completes. Writes lane completion state to D1.

export async function onRequestPost(context) {
  let payload = {};
  try {
    payload = await context.request.json();
  } catch (_) {}

  const sessionRef = String(payload.sessionRef || '').slice(0, 64);
  const state      = payload.state || {};
  const now        = Date.now();

  if (sessionRef) {
    try {
      await context.env.DB?.prepare(
        `INSERT INTO lane_events
           (session_ref, event, opened, validated, aborted, has_sparkling, has_bridge, in_tiktok_app, has_ttclid, created_at)
         VALUES (?, 'pipeline-complete', ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        sessionRef,
        String(state.opened || 'none'),
        state.validated ? 1 : 0,
        state.aborted   ? 1 : 0,
        state.hasSparkling   ? 1 : 0,
        state.hasBridge      ? 1 : 0,
        state.inTikTokApp    ? 1 : 0,
        state.ttclid         ? 1 : 0,
        now,
      ).run();
    } catch (_) {}

    context.env.TDS_ANALYTICS?.writeDataPoint({
      indexes: [sessionRef],
      blobs: ['pipeline-complete', String(state.opened || 'none')],
      doubles: [now],
    });
  }

  return new Response('{"ok":true}', {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
