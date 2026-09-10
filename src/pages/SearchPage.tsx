import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ProductGrid } from "../components/ProductGrid";
import { useApp } from "../context/AppContext";
import type { Product, TagCount } from "../types";

export function SearchPage() {
  const { wishlist, toggleWish } = useApp();
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.products({ q, tag }), api.tags()])
      .then(([catalog, tagData]) => {
        if (cancelled) return;
        setProducts(catalog.products);
        setTags(tagData.tags);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, tag]);

  const heading = useMemo(() => {
    if (tag && q) return `${q} in #${tag}`;
    if (tag) return `#${tag}`;
    if (q) return q;
    return "Search";
  }, [q, tag]);

  return (
    <main id="main" className="page">
      <p className="brand-kicker">Catalog</p>
      <h1 className="page-title">{heading}</h1>
      <p className="lede">Wider grid for matching pieces. Clear search to return to one-at-a-time browse.</p>
      <div className="tag-cloud" aria-label="Filter by tag">
        {tags.map((item) => (
          <Link
            key={item.name}
            className="tag"
            to={`/search?tag=${encodeURIComponent(item.name)}`}
            aria-current={tag === item.name ? "page" : undefined}
          >
            {item.name} · {item.count}
          </Link>
        ))}
      </div>
      {loading ? (
        <EmptyState title="Searching" body="Gathering matches…" />
      ) : products.length ? (
        <ProductGrid products={products} wishlist={wishlist} onToggle={(id) => void toggleWish(id)} />
      ) : (
        <EmptyState
          title="Nothing matches this glow"
          body="Try another tag, or return to the editorial scroll."
          action={{ to: "/", label: "Back to browse" }}
        />
      )}
    </main>
  );
}
