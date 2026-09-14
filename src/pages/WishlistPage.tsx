import { useEffect, useState } from "react";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ProductGrid } from "../components/ProductGrid";
import { useApp } from "../context/AppContext";
import type { Product } from "../types";

export function WishlistPage() {
  const { wishlist, toggleWish, user } = useApp();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.wishlist().then((data) => {
      if (!cancelled) setProducts(data.products);
    });
    return () => {
      cancelled = true;
    };
  }, [wishlist]);

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
      ) : (
        <EmptyState
          title="Nothing saved yet"
          body="Heart a product while browsing to watch restocks and price drops."
          action={{ to: "/", label: "Start browsing" }}
        />
      )}
    </main>
  );
}
