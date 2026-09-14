import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { formatPrice, stockLabel } from "../lib/format";
import type { AdvisorMessage, AdvisorProduct, AdvisorSearchHint } from "../types";

const SUGGESTIONS = ["covers my bad skin", "vanilla perfume"];

interface ThreadTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  products?: AdvisorProduct[];
  searchHint?: AdvisorSearchHint | null;
}

export function AdvisorChat() {
  const navigate = useNavigate();
  const titleId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<ThreadTurn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, open]);

  function closePanel() {
    setOpen(false);
  }

  function openProduct(id: string) {
    closePanel();
    navigate(`/product/${id}`);
  }

  async function ask(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const history: AdvisorMessage[] = turns.map((turn) => ({ role: turn.role, content: turn.text }));
    const userTurn: ThreadTurn = { id: crypto.randomUUID(), role: "user", text: message };
    setTurns((prev) => [...prev, userTurn]);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const data = await api.advisor({ message, messages: history });
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.reply,
          products: data.products,
          searchHint: data.searchHint,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the advisor.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  function onDraftKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(draft);
    }
  }

  return (
    <div className={`advisor ${open ? "open" : ""}`}>
      {open ? (
        <div className="advisor-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <header className="advisor-head">
            <div>
              <p className="brand-kicker">Catalog</p>
              <h2 id={titleId}>Ask Beauti</h2>
              <p className="advisor-lede">Picks from this catalog only.</p>
            </div>
            <button type="button" className="icon-btn advisor-close" onClick={closePanel} aria-label="Close advisor">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </button>
          </header>

          <div className="advisor-thread" ref={threadRef}>
            {turns.length === 0 ? (
              <div className="advisor-empty">
                <p>Ask for a scent, lipstick, or coverage. Answers stay on Beauti products.</p>
                <div className="advisor-suggestions">
                  {SUGGESTIONS.map((prompt) => (
                    <button key={prompt} type="button" className="tag advisor-chip" onClick={() => void ask(prompt)}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {turns.map((turn) => (
              <article key={turn.id} className={`advisor-bubble ${turn.role}`}>
                <p>{turn.text}</p>
                {turn.role === "assistant" && turn.products?.length ? (
                  <ul className="advisor-picks">
                    {turn.products.map((product) => (
                      <li key={product.id}>
                        <AdvisorPickCard product={product} onOpen={openProduct} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {turn.role === "assistant" && !turn.products?.length && turn.searchHint?.q ? (
                  <p className="advisor-search-link">
                    <Link to={`/search?q=${encodeURIComponent(turn.searchHint.q)}`} onClick={closePanel}>
                      Search “{turn.searchHint.q}”
                    </Link>
                  </p>
                ) : null}
              </article>
            ))}
            {busy ? <p className="advisor-status">Matching the catalog.</p> : null}
            {error ? <p className="advisor-error">{error}</p> : null}
          </div>

          <form className="advisor-form" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor={inputId}>
              Ask about Beauti products
            </label>
            <input
              id={inputId}
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onDraftKey}
              placeholder="vanilla perfume, full coverage"
              autoComplete="off"
              maxLength={500}
              disabled={busy}
            />
            <button className="shop-link advisor-send" type="submit" disabled={busy || !draft.trim()}>
              Ask
            </button>
            <p className="advisor-note">Product matching, not medical advice.</p>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        className="advisor-fab"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close advisor" : "Ask Beauti"}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 6.5h14v9.2H9.2L5 19.5V6.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="11" r="0.9" fill="currentColor" />
          <circle cx="12" cy="11" r="0.9" fill="currentColor" />
          <circle cx="15" cy="11" r="0.9" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

function AdvisorPickCard({ product, onOpen }: { product: AdvisorProduct; onOpen: (id: string) => void }) {
  const [broken, setBroken] = useState(false);
  const stockClass = product.availability === "out_of_stock" ? "out" : product.availability;
  return (
    <button type="button" className="advisor-pick" onClick={() => onOpen(product.id)}>
      {product.imageUrl && !broken ? (
        <img src={product.imageUrl} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="advisor-pick-fallback" aria-hidden="true">
          {product.brand.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="advisor-pick-copy">
        <span className="brand-kicker">{product.brand}</span>
        <strong>{product.name}</strong>
        <span className="advisor-pick-meta">
          {formatPrice(product.price, product.currency)}
          <span className={`stock ${stockClass}`}>{stockLabel(product)}</span>
        </span>
      </span>
    </button>
  );
}
