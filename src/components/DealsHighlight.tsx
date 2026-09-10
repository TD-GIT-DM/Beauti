import { Link } from "react-router-dom";
import { formatPrice } from "../lib/format";
import type { Product } from "../types";

export function DealsHighlight({ products }: { products: Product[] }) {
  if (!products.length) return null;
  const loop = [...products, ...products];
  return (
    <div className="deals-strip" aria-label="Best deals">
      <div className="deals-strip-inner">
        {loop.map((product, i) => (
          <Link className="deal-chip" to={`/product/${product.id}`} key={`${product.id}-${i}`}>
            <strong>{product.name}</strong>
            <span>{formatPrice(product.price, product.currency)}</span>
            {product.promoCodes[0] ? <code>{product.promoCodes[0].code}</code> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
