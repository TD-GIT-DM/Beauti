/**
 * CORS for the web SPA and the Capacitor iOS shell.
 *
 * Web on workers.dev is same-origin (no CORS). The iOS app loads bundled
 * assets from https://localhost (Capacitor iosScheme) or capacitor://localhost
 * and calls this Worker, so the browser engine treats those as cross-origin.
 *
 * Cookies: WKWebView often drops third-party cookies. Native sign-in therefore
 * also sends X-Beauti-Session (see worker/auth.ts). Allow-Credentials is still
 * on so a cookie is used when the WebView actually stores it.
 */

const LIVE_WEB_ORIGINS = new Set([
  "https://beauti.tristan-morgenthaler.workers.dev",
]);

export const CORS_ALLOW_HEADERS = [
  "Accept",
  "Authorization",
  "Content-Type",
  "X-Beauti-Session",
  "X-Device-Id",
].join(", ");

export const CORS_ALLOW_METHODS = "GET, HEAD, POST, PATCH, DELETE, OPTIONS";
export const CORS_EXPOSE_HEADERS = "X-Beauti-Session";

export function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const oct = m.slice(1).map(Number);
  if (oct.some((n) => n > 255)) return false;
  const [a, b] = oct;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export function isAllowedCorsOrigin(origin: string): boolean {
  const value = origin.trim();
  if (!value) return false;
  if (LIVE_WEB_ORIGINS.has(value.replace(/\/$/, ""))) return true;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const protocol = url.protocol;
  const host = url.hostname;

  if (protocol === "capacitor:" || protocol === "ionic:") {
    return host === "localhost" || host === "capacitor" || host === "";
  }

  if (protocol !== "http:" && protocol !== "https:") return false;

  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") {
    return true;
  }
  if (isPrivateIPv4(host)) return true;
  if (protocol === "https:" && host.endsWith(".workers.dev")) return true;
  return false;
}

export function applyCorsHeaders(headers: Headers, origin: string | null | undefined): boolean {
  if (!origin || !isAllowedCorsOrigin(origin)) return false;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS);
  headers.set("Access-Control-Allow-Methods", CORS_ALLOW_METHODS);
  headers.set("Access-Control-Expose-Headers", CORS_EXPOSE_HEADERS);
  const vary = headers.get("Vary");
  if (!vary) headers.set("Vary", "Origin");
  else if (!/\bOrigin\b/i.test(vary)) headers.set("Vary", `${vary}, Origin`);
  return true;
}

export function handleCorsPreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  const headers = new Headers();
  applyCorsHeaders(headers, request.headers.get("Origin"));
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
}

export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  applyCorsHeaders(headers, request.headers.get("Origin"));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function isCrossSiteRequest(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    const workerHost = new URL(request.url).host;
    const originHost = new URL(origin).host;
    return originHost !== workerHost;
  } catch {
    return true;
  }
}
