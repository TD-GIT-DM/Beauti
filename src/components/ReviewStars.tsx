import { formatRating, formatReviewCount } from "../lib/reviews";

export function ReviewStars({
  rating,
  count,
  compact = false,
}: {
  rating: number;
  count: number;
  compact?: boolean;
}) {
  const label = `${formatRating(rating)} out of 5 stars, ${formatReviewCount(count)} reviews`;
  return (
    <p className={`review-stars${compact ? " compact" : ""}`} aria-label={label}>
      <span className="review-star-row" style={{ ["--rating" as string]: String(rating) }} aria-hidden="true">
        ★★★★★
      </span>
      <span className="review-score" aria-hidden="true">
        {formatRating(rating)}
      </span>
      <span className="review-count" aria-hidden="true">
        ({formatReviewCount(count)})
      </span>
    </p>
  );
}
