import { formatReviewDay, hasCardRating } from "../lib/reviews";
import type { ProductReviews, ReviewQuote } from "../types";
import { ReviewStars } from "./ReviewStars";
import { ShopLink } from "./ShopLink";

function QuoteList({ title, note, quotes }: { title: string; note?: string; quotes: ReviewQuote[] }) {
  return (
    <div className="review-column">
      <h2>{title}</h2>
      {note ? <p className="review-note">{note}</p> : null}
      {quotes.map((quote) => {
        const when = formatReviewDay(quote.date);
        const by = [quote.author, when].filter(Boolean).join(" · ");
        return (
          <blockquote key={`${quote.rating}-${quote.date ?? ""}-${quote.text.slice(0, 40)}`}>
            <p className="quote-stars" aria-label={`${quote.rating} out of 5 stars`}>
              <span aria-hidden="true">
                {"★".repeat(quote.rating)}
                {"☆".repeat(Math.max(0, 5 - quote.rating))}
              </span>
            </p>
            <p>{quote.text}</p>
            {by ? <footer>{by}</footer> : null}
          </blockquote>
        );
      })}
    </div>
  );
}

export function ReviewPanel({ reviews }: { reviews: ProductReviews | null }) {
  if (!reviews) return null;
  if (reviews.status === "none") {
    return (
      <section className="review-panel" aria-label="Reviews">
        <p className="brand-kicker">Reviews</p>
        <p>No reviews found yet.</p>
      </section>
    );
  }

  const checked = formatReviewDay(reviews.fetchedAt);
  const positive = reviews.positive ?? [];
  const negative = reviews.negative ?? [];
  const lowTitle = reviews.negativeLabel === "mixed" ? "3 star reviews" : "1 and 2 star reviews";

  return (
    <section className="review-panel" aria-label="Reviews">
      <p className="brand-kicker">Reviews</p>
      {hasCardRating(reviews) ? <ReviewStars rating={reviews.rating} count={reviews.count} /> : null}
      {reviews.source && reviews.sourceUrl ? (
        <p className="review-source">
          Reviews from <ShopLink href={reviews.sourceUrl}>{reviews.source}</ShopLink>
          {checked ? <span>Checked {checked}.</span> : null}
        </p>
      ) : null}
      {positive.length ? <QuoteList title="4 and 5 star reviews" quotes={positive} /> : null}
      {negative.length ? (
        <QuoteList
          title={lowTitle}
          note={
            reviews.negativeLabel === "mixed"
              ? "No 1 or 2 star comments were on the source, so these are 3 star reviews."
              : undefined
          }
          quotes={negative}
        />
      ) : null}
      {!positive.length && !negative.length ? <p>No review comments found yet.</p> : null}
    </section>
  );
}
