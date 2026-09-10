import { type FormEvent, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export function Layout() {
  const { unread } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get("q") ?? "");
  const solid = location.pathname !== "/";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const value = q.trim();
    if (!value) navigate("/");
    else navigate(`/search?q=${encodeURIComponent(value)}`);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={`app-header ${solid ? "solid" : ""}`}>
        <Link className="wordmark" to="/">
          Beauti
        </Link>
        <form className="search-form" onSubmit={onSearch} role="search">
          <label className="sr-only" htmlFor="catalog-search">
            Search products and tags
          </label>
          <input
            id="catalog-search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value === "") navigate("/");
            }}
            placeholder="Search tags, brands, glow…"
            autoComplete="off"
          />
        </form>
        <nav className="header-actions" aria-label="Account">
          <NavLink className="icon-btn" to="/wishlist" aria-label="Wishlist">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 20s-7-4.6-9.2-8.2C1 9.4 2.2 6 5.6 6c2 0 3.2 1.2 3.9 2.2C10.2 7.2 11.4 6 13.4 6c3.4 0 4.6 3.4 2.8 5.8C14 15.4 12 20 12 20z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </NavLink>
          <NavLink
            className="icon-btn"
            to="/notifications"
            aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 22a2.2 2.2 0 0 0 2.2-2H9.8A2.2 2.2 0 0 0 12 22Zm8-5V11a8 8 0 1 0-16 0v6L2 19v1h20v-1l-2-2Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            {unread > 0 ? <span className="badge">{unread > 9 ? "9+" : unread}</span> : null}
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </>
  );
}
