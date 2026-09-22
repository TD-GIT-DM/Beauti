import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DealsHighlight } from "../components/DealsHighlight";
import { EmptyState } from "../components/EmptyState";
import { ProductCover } from "../components/ProductCover";
import { useApp } from "../context/AppContext";
import type { Product } from "../types";

export function HomePage() {
  const { wishlist, toggleWish } = useApp();
  const [deals, setDeals] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .deals()
      .then((dealData) => {
        if (!cancelled) setDeals(dealData.products);
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

  if (error) {
    return (
      <main id="main" className="page">
        <EmptyState title="Catalog unavailable" body={error} />
      </main>
    );
  }

  if (loading) {
    return (
      <main id="main" className="page">
        <EmptyState title="Loading" body="Loading deals and prices." />
      </main>
    );
  }

  if (!deals.length) {
    return (
      <main id="main" className="page">
        <EmptyState
          title="No deals right now"
          body="Search the catalog while we look for markdowns."
          action={{ to: "/search", label: "Search catalog" }}
        />
      </main>
    );
  }

  return (
    <main id="main">
      <DealsHighlight products={deals} />
      <h1 className="sr-only">Top five deals. Real discounts, then best prices.</h1>
      <div className="snap-catalog" aria-label="Top five deals">
        {deals.map((product, index) => (
          <section className="snap-item" key={product.id} aria-label={`${product.brand} ${product.name}`}>
            <ProductCover
              product={product}
              variant="hero"
              wished={wishlist.has(product.id)}
              onToggle={(id) => void toggleWish(id)}
              dealRank={index + 1}
              dealTotal={deals.length}
            />
          </section>
        ))}
        <section className="snap-item explore-snap" aria-label="Browse the full catalog">
          <div className="explore-snap-inner">
            <p className="brand-kicker">Catalog</p>
            <h2 className="page-title">More products</h2>
            <p className="lede">
              The first five are retailer markdowns when we have them. Otherwise we show best prices, never a fake
              percent off. Search lipstick, foundation, skincare, fragrance, hair, nails, and tools.
            </p>
            <Link className="shop-link" to="/search">
              Search the catalog
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
