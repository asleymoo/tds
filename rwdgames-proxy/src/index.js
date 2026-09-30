export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CAPI proxy: Everflow fires GET /capi?ttclid=...&event=...&payout=...
    // We transform it into a TikTok Events API POST, keeping the token server-side.
    if (url.pathname === "/capi") {
      const UNEXPANDED = /^(__CLICK_?ID__|_CLICKID_|\{ttclid\}|\{clickid\})$/i;
      const rawClid = url.searchParams.get("ttclid") || "";
      const ttclid = UNEXPANDED.test(rawClid) ? "" : rawClid;
      const event = url.searchParams.get("event") || "Download";
      const ip = url.searchParams.get("ip") || "";
      const ua = url.searchParams.get("ua") || "";
      const nowMs = Date.now();

      const user = { ttclid };
      if (ip) user.ip = ip;
      if (ua) user.user_agent = ua;

      const body = {
        event_source: "web",
        event_source_id: "DAUDSBRC77U5PB60GGK0",
        data: [
          {
            event,
            event_time: Math.floor(nowMs / 1000),
            user,
            properties: {},
          },
        ],
      };

      const ttResp = await fetch(
        "https://business-api.tiktok.com/open_api/v1.3/event/track/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Access-Token": env.TT_ACCESS_TOKEN,
          },
          body: JSON.stringify(body),
        }
      );

      const text = await ttResp.text();
      return new Response(text, {
        status: ttResp.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Default: reverse-proxy all other requests to tds-bait.pages.dev
    url.hostname = "tds-bait.pages.dev";
    url.port = "";
    const headers = new Headers(request.headers);
    headers.delete("x-forwarded-for");
    headers.set("host", "tds-bait.pages.dev");
    const proxied = new Request(url.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "follow",
    });
    const response = await fetch(proxied);
    const resHeaders = new Headers(response.headers);
    resHeaders.delete("access-control-allow-origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  },
};
