import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { ProductGrid } from "../components/ProductGrid";
import { SearchFilters, type SearchFilterValues } from "../components/SearchFilters";
import { useApp } from "../context/AppContext";
import { parseOptionalNumber, withoutTagParam } from "../lib/search";
import type { Product, ProductSort } from "../types";

export function SearchPage() {
  const { wishlist, toggleWish } = useApp();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const minPrice = params.get("minPrice") ?? "";
  const maxPrice = params.get("maxPrice") ?? "";
  const minDiscount = params.get("minDiscount") ?? "";
  const sort = (params.get("sort") ?? "") as ProductSort | "";
  const [draftQ, setDraftQ] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterValues: SearchFilterValues = { minPrice, maxPrice, minDiscount, sort };
  const activeFilterCount = [minPrice, maxPrice, minDiscount, sort].filter(Boolean).length;
  const isLanding = !q && activeFilterCount === 0;

  useEffect(() => {
    if (!params.has("tag")) return;
    setParams(withoutTagParam(params), { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .products({
        q,
        minPrice: parseOptionalNumber(minPrice),
        maxPrice: parseOptionalNumber(maxPrice),
        minDiscount: parseOptionalNumber(minDiscount),
        sort: sort || undefined,
      })
      .then((catalog) => {
        if (cancelled) return;
        setProducts(catalog.products);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, minPrice, maxPrice, minDiscount, sort]);

  const heading = useMemo(() => {
    if (q) return q;
    if (activeFilterCount) return "Filtered catalog";
    return "Search";
  }, [q, activeFilterCount]);

  function runSearch(value: string) {
    const next = withoutTagParam(params);
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    setParams(next);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    runSearch(draftQ);
  }

  function applyFilters(next: SearchFilterValues) {
    const updated = withoutTagParam(params);
    setOrDelete(updated, "minPrice", next.minPrice);
    setOrDelete(updated, "maxPrice", next.maxPrice);
    setOrDelete(updated, "minDiscount", next.minDiscount);
    setOrDelete(updated, "sort", next.sort);
    setParams(updated);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setDraftQ("");
    setParams(new URLSearchParams());
    setFiltersOpen(false);
  }

  return (
    <main id="main" className={isLanding ? "search-landing" : "page search-results"}>
      <SearchFilters
        values={filterValues}
        open={filtersOpen}
        onToggle={() => setFiltersOpen((open) => !open)}
        onApply={applyFilters}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {isLanding ? (
        <div className="search-hero">
          <p className="brand-kicker">Catalog</p>
          <h1 className="page-title">Search</h1>
          <p className="lede search-hero-lede">
            Try “red lipstick”, or filter by price and discount.
          </p>
          <SearchBox id="hero-search" value={draftQ} onChange={setDraftQ} onSubmit={onSearch} centered />
        </div>
      ) : (
        <>
          <SearchBox id="results-search" value={draftQ} onChange={setDraftQ} onSubmit={onSearch} />
          <p className="brand-kicker">Catalog</p>
          <h1 className="page-title">{heading}</h1>
          <p className="lede">
            {loading
              ? "Loading results."
              : `${products.length} result${products.length === 1 ? "" : "s"}.`}
          </p>
          {loading ? (
            <EmptyState title="Searching" body="Loading results." />
          ) : products.length ? (
            <ProductGrid products={products} wishlist={wishlist} onToggle={(id) => void toggleWish(id)} />
          ) : (
            <EmptyState
              title="No matches"
              body="Try another color, brand, or clear the filters."
              action={{ to: "/search", label: "Reset search" }}
            />
          )}
        </>
      )}
    </main>
  );
}

function SearchBox({
  id,
  value,
  onChange,
  onSubmit,
  centered,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  centered?: boolean;
}) {
  return (
    <form className={`search-form ${centered ? "search-form-hero" : "search-form-page"}`} onSubmit={onSubmit} role="search">
      <label className="sr-only" htmlFor={id}>
        Search products, brands, and colors
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search red lipstick, blush, serum"
        autoComplete="off"
        autoFocus={centered}
      />
    </form>
  );
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) params.set(key, trimmed);
  else params.delete(key);
}
