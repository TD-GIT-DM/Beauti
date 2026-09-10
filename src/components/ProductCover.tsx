import { Link } from "react-router-dom";
import type { Product } from "../types";

interface Props {
  product: Product;
  wished: boolean;
  onToggle: (id: string) => void;
  variant?: "hero" | "grid" | "detail";
}

export function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function stockLabel(product: Product) {
  if (product.availability === "out_of_stock") return "Out of stock";
  if (product.availability === "limited") return "Limited";
  return "In stock";
}

export function HeartButton({
  wished,
  name,
  onToggle,
}: {
  wished: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-pressed={wished}
      aria-label={wished ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7-4.6-9.2-8.2C1 9.4 2.2 6 5.6 6c2 0 3.2 1.2 3.9 2.2C10.2 7.2 11.4 6 13.4 6c3.4 0 4.6 3.4 2.8 5.8C14 15.4 12 20 12 20z"
          fill={wished ? "#D4AF37" : "none"}
          stroke="#D4AF37"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  );
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
            e.currentTarget.nextElementSibling?.classList.add("show");
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
