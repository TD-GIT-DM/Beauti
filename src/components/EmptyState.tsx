import { Link } from "react-router-dom";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? (
        <Link className="shop-link" to={action.to} style={{ margin: "1rem auto 0" }}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
