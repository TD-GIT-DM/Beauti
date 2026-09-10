import { Link } from "react-router-dom";
import { formatPrice, stockLabel } from "../lib/format";
import type { Product } from "../types";
import { HeartButton } from "./HeartButton";

interface Props {
  product: Product;
  wished: boolean;
  onToggle: (id: string) => void;
  variant?: "hero" | "grid" | "detail";
}

export function ProductCover({ product, wished, onToggle, variant = "hero" }: Props) {
  const promo = product.promoCodes[0];
  const to = `/product/${product.id}`;

  return (
    <article className={`cover ${variant}`}>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="cover-fallback" aria-hidden="true" />
      <div className="cover-scrim" />
      <div className="cover-actions">
        <HeartButton wished={wished} name={product.name} onToggle={() => onToggle(product.id)} />
      </div>
      <div className="cover-body">
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
        <a className="shop-link" href={product.productUrl} target="_blank" rel="noreferrer">
          Shop {promo ? `with ${promo.code}` : "now"}
        </a>
      </div>
    </article>
  );
}
