/** Drop private catalog tags before a product is sent to a client. */
export function omitStoredTags<T extends { tags?: unknown }>(product: T): Omit<T, "tags"> {
  const copy = { ...product };
  delete (copy as { tags?: unknown }).tags;
  return copy as Omit<T, "tags">;
}
