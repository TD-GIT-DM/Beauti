const NATIVE_FLAG = import.meta.env?.VITE_NATIVE;
const CONFIGURED_API = (import.meta.env?.VITE_API_BASE ?? "").trim().replace(/\/$/, "");

export const LIVE_WORKER_ORIGIN = "https://beauti.tristan-morgenthaler.workers.dev";

/** True when this bundle was built for Capacitor (`VITE_NATIVE=1`). */
export function isNativeBuild(): boolean {
  return NATIVE_FLAG === "1" || NATIVE_FLAG === "true";
}

/** True only inside a real Capacitor WKWebView / Android WebView. */
export function isNativeRuntime(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function isNativeApp(): boolean {
  return isNativeBuild() || isNativeRuntime();
}

/**
 * Absolute API origin for the iOS shell. Empty string keeps relative `/api`
 * on the website (same-origin Worker).
 */
export function apiBase(): string {
  if (CONFIGURED_API) return CONFIGURED_API;
  if (isNativeRuntime()) return LIVE_WORKER_ORIGIN;
  return "";
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;
  try {
    if (isNativeRuntime()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    }
  } catch {
    /* fall through to window.open */
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
