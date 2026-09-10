import { ProductCover } from "./ProductCover";
import type { Product } from "../types";

export function SnapCatalog({
  products,
  wishlist,
  onToggle,
}: {
  products: Product[];
  wishlist: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="snap-catalog" aria-label="Product catalog">
      {products.map((product) => (
        <section className="snap-item" key={product.id} aria-label={`${product.brand} ${product.name}`}>
          <ProductCover
            product={product}
            variant="hero"
            wished={wishlist.has(product.id)}
            onToggle={onToggle}
          />
        </section>
      ))}
    </div>
  );
}
