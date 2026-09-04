interface Env {
  API_ORIGIN: string;
}

const allowedMethods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);

function normalizeOrigin(value: string): URL {
  const origin = new URL(value);
  if (origin.protocol !== "https:") {
    throw new Error("API_ORIGIN must use HTTPS");
  }
  origin.pathname = origin.pathname.replace(/\/+$/, "");
  return origin;
}

function isPreflight(request: Request): boolean {
  return request.method === "OPTIONS" && Boolean(request.headers.get("Origin"));
}

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  if (origin === "https://applyai.studio" || origin === "https://www.applyai.studio") {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Vary", "Origin");
  }
  return headers;
}

function withCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  corsHeaders(request).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!allowedMethods.has(request.method)) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(request),
      });
    }

    if (isPreflight(request)) {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    let origin: URL;
    try {
      origin = normalizeOrigin(env.API_ORIGIN);
    } catch {
      return new Response("Cloudflare API proxy is not configured", { status: 500 });
    }

    const target = new URL(request.url);
    target.protocol = origin.protocol;
    target.host = origin.host;
    target.pathname = `${origin.pathname}${target.pathname}`.replace(/\/\/{2,}/g, "/");

    const headers = new Headers(request.headers);
    headers.delete("Host");
    headers.set("X-Forwarded-Host", new URL(request.url).host);
    headers.set("X-Forwarded-Proto", "https");

    const upstreamRequest = new Request(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    try {
      const response = await fetch(upstreamRequest);
      return withCors(response, request);
    } catch {
      return withCors(
        new Response(JSON.stringify({ success: false, error: "API origin unavailable" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }),
        request,
      );
    }
  },
} satisfies ExportedHandler<Env>;
