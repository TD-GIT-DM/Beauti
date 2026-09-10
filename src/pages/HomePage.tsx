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
        <EmptyState title="Preparing the edit" body="Loading the strongest discounts…" />
      </main>
    );
  }

  if (!deals.length) {
    return (
      <main id="main" className="page">
        <EmptyState
          title="No discounts yet"
          body="The catalog is up — search shades and treatments while deals refresh."
          action={{ to: "/search", label: "Search the vault" }}
        />
      </main>
    );
  }

  return (
    <main id="main">
      <DealsHighlight products={deals} />
      <h1 className="sr-only">Top five beauty deals by discount</h1>
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
            <p className="brand-kicker">The vault</p>
            <h2 className="page-title">One hundred shades deeper</h2>
            <p className="lede">
              Those five are the sharpest discounts right now. Search lipstick, foundation shades, skincare, fragrance,
              hair, nails, and tools — or start with a color.
            </p>
            <Link className="shop-link" to="/search">
              Search the catalog
            </Link>
            <div className="tag-row explore-tags">
              {["lipstick", "red", "blush", "foundation", "skincare", "fragrance"].map((tag) => (
                <Link key={tag} className="tag" to={`/search?tag=${encodeURIComponent(tag)}`}>
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
