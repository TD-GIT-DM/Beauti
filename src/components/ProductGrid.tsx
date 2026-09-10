import { ProductCover } from "./ProductCover";
import type { Product } from "../types";

export function ProductGrid({
  products,
  wishlist,
  onToggle,
}: {
  products: Product[];
  wishlist: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="catalog-grid">
      {products.map((product) => (
        <div className="grid-card" key={product.id}>
          <ProductCover
            product={product}
            variant="grid"
            wished={wishlist.has(product.id)}
            onToggle={onToggle}
          />
        </div>
      ))}
    </div>
  );
}
