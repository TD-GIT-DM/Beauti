export const SESSION_COOKIE = "beauti_session";
export const SESSION_HEADER = "X-Beauti-Session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionIdFrom(request: Request): string | null {
  const header = request.headers.get(SESSION_HEADER)?.trim();
  if (header) return header;
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)beauti_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

export function sessionCookie(id: string, secure: boolean, crossSite = false): string {
  const sameSite = crossSite ? "None" : "Lax";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(id)}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE}`,
    "HttpOnly",
    `SameSite=${sameSite}`,
  ];
  if (secure || crossSite) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(secure: boolean, crossSite = false): string {
  const sameSite = crossSite ? "None" : "Lax";
  const parts = [`${SESSION_COOKIE}=`, "Path=/", "Max-Age=0", "HttpOnly", `SameSite=${sameSite}`];
  if (secure || crossSite) parts.push("Secure");
  return parts.join("; ");
}
