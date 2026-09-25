import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { PreorderList } from "../components/PreorderList";
import { ProductGrid } from "../components/ProductGrid";
import { useApp } from "../context/AppContext";
import type { Product, PublicPreorder } from "../types";

export function WishlistPage() {
  const { wishlist, toggleWish, user } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [preorders, setPreorders] = useState<PublicPreorder[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.wishlist().then((data) => {
      if (cancelled) return;
      setProducts(data.products);
      setPreorders(data.preorders ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [wishlist]);

  async function togglePreorder(id: string, wished: boolean) {
    const next = !wished;
    setPreorders((list) => list.map((item) => (item.id === id ? { ...item, wishlisted: next } : item)));
    try {
      if (next) await api.addPreorderWish(id);
      else await api.removePreorderWish(id);
      if (!next) setPreorders((list) => list.filter((item) => item.id !== id));
    } catch {
      setPreorders((list) => list.map((item) => (item.id === id ? { ...item, wishlisted: wished } : item)));
    }
  }

  return (
    <main id="main" className="page">
      <p className="brand-kicker">Saved</p>
      <h1 className="page-title">Wishlist</h1>
      <p className="lede">
        {user
          ? `Saved to ${user.username}. Hearts follow this account, not just this browser.`
          : "Hearts stay on this device. Sign in from Settings to use them on another device."}{" "}
        We’ll notify you when something restocks or drops in price.
      </p>
      {products.length ? (
        <ProductGrid products={products} wishlist={wishlist} onToggle={(id) => void toggleWish(id)} />
      ) : null}
      {preorders.length ? (
        <section className="preorder-section" aria-labelledby="wishlist-preorder">
          <h2 id="wishlist-preorder" className="preorder-heading">
            Coming soon
          </h2>
          <p className="preorder-note">We will tell you when a saved coming soon item can be purchased.</p>
          <PreorderList items={preorders} onToggle={(id, wished) => void togglePreorder(id, wished)} />
        </section>
      ) : null}
      {!products.length && !preorders.length ? (
        <EmptyState
          title="Nothing saved yet"
          body="Heart a product while browsing to watch restocks and price drops."
          action={{ to: "/", label: "Start browsing" }}
        />
      ) : null}
    </main>
  );
}
