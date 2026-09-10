import { type FormEvent, useEffect, useState } from "react";
import type { ProductSort } from "../types";

export interface SearchFilterValues {
  minPrice: string;
  maxPrice: string;
  minDiscount: string;
  sort: ProductSort | "";
}

export function SearchFilters({
  values,
  open,
  onToggle,
  onApply,
  onClear,
  activeCount,
}: {
  values: SearchFilterValues;
  open: boolean;
  onToggle: () => void;
  onApply: (next: SearchFilterValues) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const [draft, setDraft] = useState(values);

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onApply(draft);
  }

  return (
    <div className="search-toolbar">
      <button
        type="button"
        className={`ghost-btn filter-toggle ${activeCount ? "active" : ""}`}
        aria-expanded={open}
        aria-controls="search-filter-panel"
        onClick={onToggle}
      >
        Filter{activeCount ? ` · ${activeCount}` : ""}
      </button>
      {open ? (
        <form id="search-filter-panel" className="filter-panel" onSubmit={submit}>
          <p className="brand-kicker">Price and discount</p>
          <div className="filter-row">
            <label className="filter-field">
              Min price
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                placeholder="0"
                value={draft.minPrice}
                onChange={(e) => setDraft((prev) => ({ ...prev, minPrice: e.target.value }))}
              />
            </label>
            <label className="filter-field">
              Max price
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                placeholder="200"
                value={draft.maxPrice}
                onChange={(e) => setDraft((prev) => ({ ...prev, maxPrice: e.target.value }))}
              />
            </label>
          </div>
          <div className="filter-row">
            <label className="filter-field">
              Min discount %
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={90}
                step="1"
                placeholder="10"
                value={draft.minDiscount}
                onChange={(e) => setDraft((prev) => ({ ...prev, minDiscount: e.target.value }))}
              />
            </label>
            <label className="filter-field">
              Sort
              <select
                value={draft.sort}
                onChange={(e) => setDraft((prev) => ({ ...prev, sort: e.target.value as ProductSort | "" }))}
              >
                <option value="">Featured</option>
                <option value="discount_desc">Highest discount</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="filter-actions">
            <button type="submit" className="shop-link filter-apply">
              Apply filters
            </button>
            <button type="button" className="text-btn" onClick={onClear}>
              Clear
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
