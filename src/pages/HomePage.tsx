import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DealsHighlight } from "../components/DealsHighlight";
import { EmptyState } from "../components/EmptyState";
import { SnapCatalog } from "../components/SnapCatalog";
import { useApp } from "../context/AppContext";
import type { Product } from "../types";

export function HomePage() {
  const { wishlist, toggleWish } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.products(), api.deals()])
      .then(([catalog, dealData]) => {
        if (cancelled) return;
        setProducts(catalog.products);
        setDeals(dealData.products);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main id="main" className="page">
        <EmptyState title="Catalog unavailable" body={error} />
      </main>
    );
  }

  if (!products.length) {
    return (
      <main id="main" className="page">
        <EmptyState title="Preparing the edit" body="Loading the catalog…" />
      </main>
    );
  }

  return (
    <main id="main">
      <DealsHighlight products={deals} />
      <h1 className="sr-only">Beauti catalog</h1>
      <SnapCatalog products={products} wishlist={wishlist} onToggle={(id) => void toggleWish(id)} />
    </main>
  );
}
