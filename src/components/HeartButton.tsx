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
          fill={wished ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    </button>
  );
}
