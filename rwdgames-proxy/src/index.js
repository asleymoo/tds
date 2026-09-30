export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "tds-bait.pages.dev";
    url.port = "";
    // Strip CF-specific headers that break same-origin assumptions
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
    // Pass through response as-is; strip CORS headers that would lock to pages.dev origin
    const resHeaders = new Headers(response.headers);
    resHeaders.delete("access-control-allow-origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  },
};
