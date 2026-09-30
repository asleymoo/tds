const LANES = [
  'https://tds-lane-1-attribution.t9k2x8mq.workers.dev',
  'https://tds-lane-2-antitamper.t9k2x8mq.workers.dev',
  'https://tds-lane-3-classify.t9k2x8mq.workers.dev',
  'https://tds-lane-4-container.t9k2x8mq.workers.dev',
  'https://tds-lane-5-reveal.t9k2x8mq.workers.dev',
];

export async function onRequestPost(context) {
  const idx = parseInt(context.params.n, 10) - 1;
  if (idx < 0 || idx >= LANES.length) {
    return new Response('Not found', { status: 404 });
  }

  const resp = await fetch(LANES[idx], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: context.request.body,
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
    },
  });
}
