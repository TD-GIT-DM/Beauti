import { useEffect, useState } from "react";
import { formatCountdown, formatLongDate, preorderTiming } from "../lib/preorder";
import { formatDiscount, formatPrice } from "../lib/format";
import type { PublicPreorder } from "../types";
import { HeartButton } from "./HeartButton";
import { ShopLink } from "./ShopLink";

function brandMonogram(brand: string): string {
  const parts = brand.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return brand.slice(0, 2).toUpperCase();
}

function PreorderCard({
  item,
  now,
  onToggle,
}: {
  item: PublicPreorder;
  now: number;
  onToggle: (id: string, wished: boolean) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const timing = preorderTiming(item, now);
  const when =
    timing.mode === "countdown" && timing.countdownTo != null
      ? `${timing.text} ${formatCountdown(timing.countdownTo - now)}`
      : timing.text;
  const ends = item.endsAt ? `Ends ${formatLongDate(item.endsAt)}` : null;
  const showPhoto = Boolean(item.imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.imageUrl]);

  return (
    <article className="preorder-card">
      <div className={`preorder-photo${showPhoto ? "" : " missing"}`}>
        {showPhoto ? (
          <img src={item.imageUrl ?? ""} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <span className="pack-monogram">{brandMonogram(item.brand)}</span>
        )}
      </div>
      <div className="preorder-copy">
        <div className="preorder-top">
          <p className="brand-kicker">{item.brand}</p>
          <HeartButton
            wished={item.wishlisted}
            name={item.name}
            onToggle={() => onToggle(item.id, item.wishlisted)}
          />
        </div>
        <h3 className="preorder-name">{item.name}</h3>
        <p className="preorder-when">
          {when}
          {ends ? <span className="preorder-ends">{ends}</span> : null}
        </p>
        <div className="price-row">
          {item.price != null ? <span className="price">{formatPrice(item.price, item.currency)}</span> : null}
          {item.discountPercent > 0 ? <span className="preorder-off">{formatDiscount(item.discountPercent)}</span> : null}
          {item.price != null && item.listPrice != null && item.listPrice > item.price && item.discountPercent === 0 ? (
            <span className="preorder-value">Value {formatPrice(item.listPrice, item.currency)}</span>
          ) : null}
          {item.price != null && item.listPrice != null && item.discountPercent > 0 ? (
            <span className="preorder-was">{formatPrice(item.listPrice, item.currency)}</span>
          ) : null}
        </div>
        <p className="preorder-desc">{item.description}</p>
        <p className="preorder-checked">Last checked {formatLongDate(item.lastVerifiedAt)}</p>
        <ShopLink className="shop-link" href={item.productUrl}>
          View product
        </ShopLink>
      </div>
    </article>
  );
}

export function PreorderList({
  items,
  onToggle,
}: {
  items: PublicPreorder[];
  onToggle: (id: string, wished: boolean) => void;
}) {
  const ticking = items.some((item) => item.datePrecision === "datetime" && item.startsAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);

  const visible = items.filter((item) => !preorderTiming(item, now).ended);
  if (!visible.length) return null;

  return (
    <div className="preorder-list">
      {visible.map((item) => (
        <PreorderCard key={item.id} item={item} now={now} onToggle={onToggle} />
      ))}
    </div>
  );
}
