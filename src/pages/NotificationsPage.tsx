import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useApp } from "../context/AppContext";
import { api } from "../api/client";
import { useState } from "react";

export function NotificationsPage() {
  const { notifications, unread, markRead, markAllRead, requestPush, refreshNotifications } = useApp();
  const [scanning, setScanning] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function enableAlerts() {
    await requestPush();
    setNote(
      Notification.permission === "granted"
        ? "Browser alerts on. We’ll also keep them in this inbox."
        : "Permission was not granted. In-app alerts still work.",
    );
  }

  async function simulateScan() {
    setScanning(true);
    setNote(null);
    try {
      const { summary } = await api.scan("cycle");
      await refreshNotifications();
      setNote(
        `Scan complete — ${summary.restocks.length} restock(s), ${summary.priceDrops.length} drop(s), ${summary.notificationsCreated} alert(s).`,
      );
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <main id="main" className="page">
      <p className="brand-kicker">Alerts</p>
      <div className="toolbar">
        <h1 className="page-title" style={{ margin: 0 }}>
          Notifications
        </h1>
        {unread ? (
          <button className="text-btn" type="button" onClick={() => void markAllRead()}>
            Mark all read
          </button>
        ) : null}
      </div>
      <p className="lede">
        Restock and price-drop alerts for wishlisted items. Cron scans the mock retailer feed every 15 minutes.
      </p>
      <div className="toolbar">
        <button className="ghost-btn" type="button" onClick={() => void enableAlerts()}>
          Enable browser alerts
        </button>
        <button className="ghost-btn" type="button" onClick={() => void simulateScan()} disabled={scanning}>
          {scanning ? "Scanning…" : "Run deal scan"}
        </button>
      </div>
      {note ? <p className="lede">{note}</p> : null}
      {notifications.length ? (
        <div className="notice-list">
          {notifications.map((item) => (
            <article className={`notice ${item.read ? "" : "unread"}`} key={item.id}>
              <img src={item.image_url} alt="" />
              <div>
                <h3>
                  <Link to={`/product/${item.product_id}`}>{item.title}</Link>
                </h3>
                <p>{item.body}</p>
              </div>
              {!item.read ? (
                <button className="text-btn" type="button" onClick={() => void markRead(item.id)}>
                  Read
                </button>
              ) : (
                <span className="stock">Read</span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="You’re all caught up"
          body="Heart an out-of-stock or high-price piece, then run a deal scan (or wait for cron) to see restock and drop alerts."
          action={{ to: "/wishlist", label: "Open wishlist" }}
        />
      )}
      <p className="footer-note">
        Email later: from the same cron job, send through Resend/SES using `notifications` rows where `emailed_at IS NULL`.
        Web Push later: store VAPID keys as Worker secrets and POST to `push_subscriptions.endpoint`.
      </p>
    </main>
  );
}
