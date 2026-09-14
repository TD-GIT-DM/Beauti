import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { EmptyState } from "../components/EmptyState";
import { formatPrice, stockLabel } from "../lib/format";
import { HeartButton } from "../components/HeartButton";
import { ProductCover } from "../components/ProductCover";
import { useApp } from "../context/AppContext";
import type { Product } from "../types";

export function ProductPage() {
  const { id } = useParams();
  const { wishlist, toggleWish } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .product(id)
      .then((data) => {
        if (!cancelled) setProduct(data.product);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main id="main" className="page">
        <EmptyState title="Not found" body="This product could not be found." action={{ to: "/", label: "Browse" }} />
      </main>
    );
  }
  if (!product) {
    return (
      <main id="main" className="page">
        <EmptyState title="Loading" body="Loading product." />
      </main>
    );
  }

  const wished = wishlist.has(product.id);
  const max = Math.max(...product.priceHistory.map((p) => p.price), product.price, 1);
  const restockNote =
    product.availability === "out_of_stock"
      ? ` Out of stock. Restock estimate: ${product.restockEstimate ?? "unknown / may not return"}.`
      : "";

  return (
    <main id="main" className="page">
      <div className="detail">
        <ProductCover product={product} variant="detail" wished={wished} onToggle={(pid) => void toggleWish(pid)} />
        <div className="detail-copy">
          <p className="brand-kicker">{product.brand}</p>
          <h1>{product.name}</h1>
          <div className="price-row">
            <span className="price">{formatPrice(product.price, product.currency)}</span>
            {product.listPrice && product.listPrice > product.price ? (
              <span className="promo" style={{ textDecoration: "line-through", opacity: 0.7 }}>
                {formatPrice(product.listPrice, product.currency)}
              </span>
            ) : null}
            <span className={`stock ${product.availability === "out_of_stock" ? "out" : product.availability}`}>
              {stockLabel(product)}
            </span>
            <HeartButton wished={wished} name={product.name} onToggle={() => void toggleWish(product.id)} />
          </div>
          {product.discountPercent > 0 ? (
            <p className="promo" style={{ width: "max-content" }}>
              {product.discountPercent}% off
            </p>
          ) : null}
          {product.promoCodes.map((code) => (
            <p className="promo" key={code.code} style={{ width: "max-content" }}>
              {code.code} · {code.label}
            </p>
          ))}
          <p>
            {product.description}
            {restockNote}
          </p>
          {product.priceHistory.length > 1 ? (
            <>
              <p className="brand-kicker">Price history</p>
              <div className="history" aria-hidden="true">
                {product.priceHistory.map((point) => (
                  <span
                    key={point.recordedAt}
                    style={{ height: `${Math.max(12, (point.price / max) * 100)}%` }}
                    title={`${formatPrice(point.price, product.currency)} on ${point.recordedAt}`}
                  />
                ))}
              </div>
            </>
          ) : null}
          <div className="tag-row">
            {product.tags.map((tag) => (
              <Link key={tag} className="tag" to={`/search?tag=${encodeURIComponent(tag)}`}>
                {tag}
              </Link>
            ))}
          </div>
          <p>
            <a className="shop-link" href={product.productUrl} target="_blank" rel="noreferrer">
              View retailer
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
