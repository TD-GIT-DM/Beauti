import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, getDeviceId, readLocalWishlist, writeLocalWishlist } from "../api/client";
import {
  applyTheme,
  DEFAULT_THEME,
  normalizeHex,
  readLocalTheme,
  writeLocalTheme,
  type ThemeColors,
} from "../lib/theme";
import type { AccountUser, AppNotification } from "../types";

interface AppState {
  deviceId: string;
  user: AccountUser | null;
  theme: ThemeColors;
  wishlist: Set<string>;
  notifications: AppNotification[];
  unread: number;
  toggleWish: (productId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  requestPush: () => Promise<void>;
  setTheme: (theme: ThemeColors) => void;
  resetTheme: () => void;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppCtx = createContext<AppState | null>(null);
const SEEN_KEY = "beauti_seen_notifications";

function seenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function persistSeen(ids: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

async function fireBrowserNotification(n: AppNotification) {
  const url = `/product/${n.product_id}`;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "NOTIFY",
      title: n.title,
      body: n.body,
      url,
    });
    return;
  }
  const registration = await navigator.serviceWorker?.ready.catch(() => undefined);
  if (registration?.showNotification) {
    await registration.showNotification(n.title, {
      body: n.body,
      icon: "/favicon.svg",
      data: { url },
    });
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(n.title, { body: n.body, icon: "/favicon.svg" });
  }
}

function adoptAccountTheme(user: AccountUser, fallback: ThemeColors): ThemeColors {
  const main = normalizeHex(user.themeMain ?? "") ?? fallback.main;
  const secondary = normalizeHex(user.themeSecondary ?? "") ?? fallback.secondary;
  return { main, secondary };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [deviceId] = useState(() => (typeof window === "undefined" ? "" : getDeviceId()));
  const [user, setUser] = useState<AccountUser | null>(null);
  const [theme, setThemeState] = useState<ThemeColors>(() =>
    typeof window === "undefined" ? { ...DEFAULT_THEME } : readLocalTheme(),
  );
  const [wishlist, setWishlist] = useState<Set<string>>(() => new Set(readLocalWishlist()));
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const persistTheme = useCallback((next: ThemeColors) => {
    applyTheme(next);
    writeLocalTheme(next);
    setThemeState(next);
  }, []);

  const setTheme = useCallback(
    (next: ThemeColors) => {
      persistTheme(next);
    },
    [persistTheme],
  );

  const resetTheme = useCallback(() => {
    persistTheme({ ...DEFAULT_THEME });
  }, [persistTheme]);

  const applyWishlist = useCallback((ids: string[]) => {
    const unique = [...new Set(ids)];
    setWishlist(new Set(unique));
    writeLocalWishlist(unique);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await api.notifications();
      setNotifications(data.notifications);
      setUnread(data.unread);

      const seen = seenIds();
      const fresh = data.notifications.filter((n) => !n.read && !seen.has(n.id));
      if (fresh.length && "Notification" in window && Notification.permission === "granted") {
        for (const n of fresh.slice(0, 3)) {
          await fireBrowserNotification(n);
          seen.add(n.id);
        }
        persistSeen(seen);
      }
    } catch {
      /* guest offline */
    }
  }, []);

  const finishAuth = useCallback(
    async (nextUser: AccountUser, remoteWishlist?: string[]) => {
      setUser(nextUser);
      const current = themeRef.current;
      const hasSaved = Boolean(normalizeHex(nextUser.themeMain ?? "") && normalizeHex(nextUser.themeSecondary ?? ""));
      if (hasSaved) {
        persistTheme(adoptAccountTheme(nextUser, current));
      } else {
        persistTheme(current);
        await api.saveSettings({ themeMain: current.main, themeSecondary: current.secondary }).catch(() => undefined);
      }
      if (remoteWishlist) {
        applyWishlist(remoteWishlist);
        return;
      }
      const remote = await api.wishlist();
      applyWishlist(remote.products.map((p) => p.id));
    },
    [applyWishlist, persistTheme],
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      void api
        .saveSettings({ themeMain: theme.main, themeSecondary: theme.secondary })
        .catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [theme, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocalWishlist();
      try {
        const session = await api.me();
        if (cancelled) return;
        if (session.user) {
          await finishAuth(session.user, session.wishlist);
        } else {
          const remote = await api.wishlist();
          if (cancelled) return;
          const remoteIds = remote.products.map((p) => p.id);
          const missing = local.filter((id) => !remoteIds.includes(id));
          await Promise.all(missing.map((id) => api.addWish(id).catch(() => undefined)));
          applyWishlist([...remoteIds, ...local]);
        }
      } catch {
        if (!cancelled) setWishlist(new Set(local));
      }
      if (!cancelled) await refreshNotifications();
    })();
    return () => {
      cancelled = true;
    };
  }, [applyWishlist, finishAuth, refreshNotifications]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshNotifications();
    }, 25_000);
    const onFocus = () => void refreshNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshNotifications]);

  const toggleWish = useCallback(async (productId: string) => {
    const adding = !wishlist.has(productId);
    setWishlist((prev) => {
      const next = new Set(prev);
      if (adding) next.add(productId);
      else next.delete(productId);
      writeLocalWishlist([...next]);
      return next;
    });
    try {
      if (adding) await api.addWish(productId);
      else await api.removeWish(productId);
    } catch {
      const remote = await api.wishlist().catch(() => null);
      if (remote) applyWishlist(remote.products.map((p) => p.id));
    }
  }, [applyWishlist, wishlist]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)));
    setUnread((n) => Math.max(0, n - 1));
    await api.markRead(id).catch(() => undefined);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnread(0);
    await api.markAllRead().catch(() => undefined);
  }, []);

  const requestPush = useCallback(async () => {
    if (!("Notification" in window)) return;
    await Notification.requestPermission();
  }, []);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const data = await api.signin(username, password);
      if (!data.user) throw new Error("Sign in failed.");
      await finishAuth(data.user, data.wishlist);
    },
    [finishAuth],
  );

  const signUp = useCallback(
    async (username: string, password: string) => {
      const data = await api.signup(username, password);
      if (!data.user) throw new Error("Could not create the account.");
      await finishAuth(data.user, data.wishlist);
    },
    [finishAuth],
  );

  const signOut = useCallback(async () => {
    await api.signout();
    setUser(null);
    const remote = await api.wishlist().catch(() => null);
    if (remote) applyWishlist(remote.products.map((p) => p.id));
  }, [applyWishlist]);

  const value = useMemo(
    () => ({
      deviceId,
      user,
      theme,
      wishlist,
      notifications,
      unread,
      toggleWish,
      refreshNotifications,
      markRead,
      markAllRead,
      requestPush,
      setTheme,
      resetTheme,
      signIn,
      signUp,
      signOut,
    }),
    [
      deviceId,
      user,
      theme,
      wishlist,
      notifications,
      unread,
      toggleWish,
      refreshNotifications,
      markRead,
      markAllRead,
      requestPush,
      setTheme,
      resetTheme,
      signIn,
      signUp,
      signOut,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
