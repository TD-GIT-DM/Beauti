import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDiscount, formatPrice, stockLabel } from "../lib/format";
import type { Product } from "../types";
import { HeartButton } from "./HeartButton";
import { ShopLink } from "./ShopLink";

interface Props {
  product: Product;
  wished: boolean;
  onToggle: (id: string) => void;
  variant?: "hero" | "grid" | "detail";
  dealRank?: number;
  dealTotal?: number;
}

function brandMonogram(brand: string): string {
  const parts = brand.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return brand.slice(0, 2).toUpperCase();
}

export function ProductCover({
  product,
  wished,
  onToggle,
  variant = "hero",
  dealRank,
  dealTotal,
}: Props) {
  const promo = product.promoCodes[0];
  const to = `/product/${product.id}`;
  const discount = product.discountPercent ?? 0;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [product.id, product.imageUrl]);

  const showPhoto = Boolean(product.imageUrl) && !imageFailed;

  return (
    <article className={`cover ${variant}${showPhoto ? "" : " cover-missing-photo"}`}>
      {showPhoto ? (
        <img src={product.imageUrl} alt="" onError={() => setImageFailed(true)} />
      ) : null}
      <div className="cover-fallback" aria-hidden="true">
        <div className="pack-silhouette">
          <svg viewBox="0 0 80 120" className="pack-svg">
            <rect x="22" y="8" width="36" height="10" rx="2" />
            <rect x="28" y="18" width="24" height="8" rx="1" />
            <path d="M16 32h48l6 80H10z" />
          </svg>
          <span className="pack-monogram">{brandMonogram(product.brand)}</span>
        </div>
      </div>
      <div className="cover-scrim" />
      <div className="cover-actions">
        <HeartButton wished={wished} name={product.name} onToggle={() => onToggle(product.id)} />
      </div>
      {discount > 0 ? <span className="discount-badge">{formatDiscount(discount)}</span> : null}
      <div className="cover-body">
        {dealRank ? (
          <div className="brand-kicker">
            {discount > 0 ? "Top deal" : "Best price"} {String(dealRank).padStart(2, "0")}
            {dealTotal ? ` of ${dealTotal}` : ""}
          </div>
        ) : null}
        <div className="brand-kicker">{product.brand}</div>
        {variant === "grid" ? (
          <h2 className="product-name">
            <Link to={to}>{product.name}</Link>
          </h2>
        ) : (
          <h1 className="product-name">
            {variant === "hero" ? <Link to={to}>{product.name}</Link> : product.name}
          </h1>
        )}
        <div className="price-row">
          <span className="price">{formatPrice(product.price, product.currency)}</span>
          {promo ? (
            <span className="promo">
              {promo.code} · {promo.label}
            </span>
          ) : null}
          <span className={`stock ${product.availability === "out_of_stock" ? "out" : product.availability}`}>
            {stockLabel(product)}
          </span>
        </div>
        {product.availability === "out_of_stock" ? (
          <p className="lede" style={{ margin: 0 }}>
            Restock: {product.restockEstimate ?? "unknown / may not return"}
          </p>
        ) : null}
        <div className="tag-row">
          {product.tags.slice(0, variant === "grid" ? 3 : 6).map((tag) => (
            <Link key={tag} className="tag" to={`/search?tag=${encodeURIComponent(tag)}`}>
              {tag}
            </Link>
          ))}
        </div>
        <ShopLink className="shop-link" href={product.productUrl}>
          Shop {promo ? `with ${promo.code}` : "now"}
        </ShopLink>
      </div>
    </article>
  );
}
