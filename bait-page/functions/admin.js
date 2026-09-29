// Cloudflare Pages Function — /admin dashboard.
// Protected by ADMIN_TOKEN env var. Set it in Pages → Settings → Env variables.
// Access: https://tds-bait.pages.dev/admin?token=<ADMIN_TOKEN>

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f0f11;color:#e2e2e4;font-size:14px;line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:24px 16px}
h1{font-size:22px;font-weight:600;margin-bottom:24px;color:#fff}
h2{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#7a7a85;margin-bottom:12px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:28px}
.card{background:#1a1a1f;border:1px solid #2a2a30;border-radius:10px;padding:16px}
.card .num{font-size:32px;font-weight:700;color:#fff;margin-bottom:2px}
.card .label{color:#7a7a85;font-size:12px}
.section{margin-bottom:32px}
table{width:100%;border-collapse:collapse;background:#1a1a1f;border:1px solid #2a2a30;border-radius:10px;overflow:hidden}
thead{background:#222228}
th{padding:10px 14px;text-align:left;font-size:12px;font-weight:600;color:#7a7a85;text-transform:uppercase;letter-spacing:.04em}
td{padding:10px 14px;border-top:1px solid #2a2a30;font-size:13px;vertical-align:top}
tr:hover td{background:#1f1f26}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.tag.yes{background:#0e3a1a;color:#34d058}
.tag.no{background:#3a0e0e;color:#f85149}
.tag.gray{background:#2a2a30;color:#7a7a85}
.mono{font-family:"SF Mono",Menlo,monospace;font-size:12px;color:#8b8b96}
`.trim();

function tag(val, yes = '✓', no = '✗') {
  if (val === null || val === undefined) return `<span class="tag gray">—</span>`;
  return val ? `<span class="tag yes">${yes}</span>` : `<span class="tag no">${no}</span>`;
}

function ts(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export async function onRequestGet(context) {
  const token = new URL(context.request.url).searchParams.get('token') || '';
  const expected = context.env.ADMIN_TOKEN || '';

  if (!expected || token !== expected) {
    return new Response('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="admin"' } });
  }

  const db = context.env.DB;
  if (!db) {
    return new Response('DB binding not configured', { status: 503 });
  }

  const [
    { results: sessions },
    { results: events },
    countRow,
    completedRow,
    abortedRow,
  ] = await Promise.all([
    db.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50').all(),
    db.prepare('SELECT * FROM lane_events ORDER BY created_at DESC LIMIT 50').all(),
    db.prepare('SELECT COUNT(*) as n FROM sessions').first(),
    db.prepare("SELECT COUNT(*) as n FROM lane_events WHERE event='pipeline-complete' AND aborted=0").first(),
    db.prepare("SELECT COUNT(*) as n FROM lane_events WHERE aborted=1").first(),
  ]);

  const totalSessions = countRow?.n ?? 0;
  const totalCompleted = completedRow?.n ?? 0;
  const totalAborted = abortedRow?.n ?? 0;

  const sessionRows = (sessions || []).map(s => `
    <tr>
      <td class="mono">${String(s.session_ref || '').slice(0, 16)}…</td>
      <td>${s.ip_address || '—'}</td>
      <td>${s.country || '—'}</td>
      <td class="mono" style="font-size:11px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.user_agent || '—'}</td>
      <td>${ts(s.created_at)}</td>
    </tr>`).join('');

  const eventRows = (events || []).map(e => `
    <tr>
      <td class="mono">${String(e.session_ref || '').slice(0, 16)}…</td>
      <td>${tag(e.validated)} ${tag(e.aborted, '⊘ aborted', null)}</td>
      <td>${e.opened || '—'}</td>
      <td>${tag(e.has_sparkling)} Sparkling &nbsp; ${tag(e.has_bridge)} Bridge &nbsp; ${tag(e.in_tiktok_app)} TT &nbsp; ${tag(e.has_ttclid)} clid</td>
      <td>${ts(e.created_at)}</td>
    </tr>`).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TDS Admin</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
  <h1>TDS Admin</h1>

  <div class="cards">
    <div class="card"><div class="num">${totalSessions}</div><div class="label">Total Sessions</div></div>
    <div class="card"><div class="num">${totalCompleted}</div><div class="label">Pipeline Completed</div></div>
    <div class="card"><div class="num">${totalAborted}</div><div class="label">Traffic Aborted</div></div>
    <div class="card"><div class="num">${totalSessions > 0 ? Math.round(totalCompleted / totalSessions * 100) : 0}%</div><div class="label">Completion Rate</div></div>
  </div>

  <div class="section">
    <h2>Recent Sessions</h2>
    <table>
      <thead><tr><th>Ref</th><th>IP</th><th>Country</th><th>User Agent</th><th>Created</th></tr></thead>
      <tbody>${sessionRows || '<tr><td colspan="5" style="color:#7a7a85;padding:20px">No sessions yet</td></tr>'}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Pipeline Events</h2>
    <table>
      <thead><tr><th>Session</th><th>Status</th><th>Opened via</th><th>Signals</th><th>Time</th></tr></thead>
      <tbody>${eventRows || '<tr><td colspan="5" style="color:#7a7a85;padding:20px">No events yet</td></tr>'}</tbody>
    </table>
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, private' },
  });
}
