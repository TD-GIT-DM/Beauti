import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { PreorderList } from "../components/PreorderList";
import type { PublicPreorder } from "../types";

export function PreorderPage() {
  const [upcoming, setUpcoming] = useState<PublicPreorder[]>([]);
  const [coming, setComing] = useState<PublicPreorder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishError, setWishError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .preorders()
      .then((data) => {
        if (cancelled) return;
        setUpcoming(data.upcomingDeals);
        setComing(data.comingSoon);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(id: string, wished: boolean) {
    setWishError(null);
    const next = !wished;
    const apply = (list: PublicPreorder[]) => list.map((item) => (item.id === id ? { ...item, wishlisted: next } : item));
    setUpcoming((list) => apply(list));
    setComing((list) => apply(list));
    try {
      if (next) await api.addPreorderWish(id);
      else await api.removePreorderWish(id);
    } catch (err) {
      setUpcoming((list) => list.map((item) => (item.id === id ? { ...item, wishlisted: wished } : item)));
      setComing((list) => list.map((item) => (item.id === id ? { ...item, wishlisted: wished } : item)));
      setWishError(err instanceof Error ? err.message : "Could not update the heart.");
    }
  }

  if (error) {
    return (
      <main id="main" className="page">
        <EmptyState title="Pre-order unavailable" body={error} />
      </main>
    );
  }

  return (
    <main id="main" className="page">
      <p className="brand-kicker">Ahead</p>
      <h1 className="page-title">Pre-order</h1>
      <p className="lede">
        Sales that have been announced but are not live yet, and products you cannot buy yet. Dates come from the
        retailer or the brand. If they have not posted a date, we say so.
      </p>
      {wishError ? <p className="preorder-wish-error">{wishError}</p> : null}
      <section className="preorder-section" aria-labelledby="upcoming-deals">
        <h2 id="upcoming-deals" className="preorder-heading">
          Upcoming deals
        </h2>
        <p className="preorder-note">
          When a start time passes, that card leaves this page. If the product is actually available, the next catalog
          check can add it with the retailer price.
        </p>
        {loading ? (
          <EmptyState title="Loading" body="Checking announced sales." />
        ) : upcoming.length ? (
          <PreorderList items={upcoming} onToggle={(id, wished) => void toggle(id, wished)} />
        ) : (
          <EmptyState
            title="No upcoming sales confirmed"
            body="A deal shows up here only after a retailer or brand page states the discount and when it starts, and a fresh check still matches that page."
          />
        )}
      </section>
      <section className="preorder-section" aria-labelledby="coming-soon">
        <h2 id="coming-soon" className="preorder-heading">
          Coming soon
        </h2>
        {loading ? (
          <EmptyState title="Loading" body="Checking coming soon products." />
        ) : coming.length ? (
          <PreorderList items={coming} onToggle={(id, wished) => void toggle(id, wished)} />
        ) : (
          <EmptyState
            title="Nothing coming soon confirmed"
            body="We list a product only when the brand or retailer still marks it coming soon, pre-order, or on a waitlist."
          />
        )}
      </section>
    </main>
  );
}
