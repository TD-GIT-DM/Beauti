import { type FormEvent, useEffect, useState } from "react";
import { ColorSlider } from "../components/ColorSlider";
import { useApp } from "../context/AppContext";
import { BACKGROUNDS, FONTS, PREVIEW_FONTS_HREF, type BackgroundId, type FontId } from "../lib/look";

export function SettingsPage() {
  const { user, theme, setTheme, resetTheme, signIn, signUp, signOut } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"signin" | "signup" | "signout" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const background = theme.background ?? "black";
  const font = theme.font ?? "classic";

  useEffect(() => {
    const id = "beauti-font-preview";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.crossOrigin = "anonymous";
    link.href = PREVIEW_FONTS_HREF;
    document.head.appendChild(link);
  }, []);

  async function submit(mode: "signin" | "signup", e: FormEvent) {
    e.preventDefault();
    setBusy(mode);
    setError(null);
    setNote(null);
    try {
      if (mode === "signup") {
        await signUp(username, password);
        setNote("Account created. Hearts from this device were added to this username.");
      } else {
        await signIn(username, password);
        setNote("Signed in. Hearts from this device were added to the account wishlist.");
      }
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function leave() {
    setBusy("signout");
    setError(null);
    setNote(null);
    try {
      await signOut();
      setNote("Signed out. Hearts and settings stay on this device.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign out failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="main" className="page settings-page">
      <p className="brand-kicker">Account</p>
      <h1 className="page-title">Settings</h1>
      <p className="lede">
        Create a username to keep your wishlist on more than one device. Guests keep colors, sparkle, and font
        on this device. Accounts save them.
      </p>

      <div className="settings-stack">
        <section className="settings-panel" aria-labelledby="account-heading">
          <h2 id="account-heading">Account</h2>
          {user ? (
            <>
              <p className="lede" style={{ margin: 0 }}>
                Signed in as <strong className="account-name">{user.username}</strong>. Hearts are saved to this
                username. Sign in elsewhere to load the same wishlist.
              </p>
              <button className="ghost-btn" type="button" onClick={() => void leave()} disabled={busy === "signout"}>
                {busy === "signout" ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <form className="settings-form" onSubmit={(e) => void submit("signin", e)}>
              <label className="filter-field">
                Username
                <input
                  value={username}
                  autoComplete="username"
                  spellCheck={false}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourname"
                />
              </label>
              <label className="filter-field">
                Password
                <input
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
              <div className="settings-actions">
                <button className="shop-link settings-submit" type="submit" disabled={Boolean(busy)}>
                  {busy === "signin" ? "Signing in…" : "Sign in"}
                </button>
                <button
                  className="ghost-btn"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={(e) => void submit("signup", e)}
                >
                  {busy === "signup" ? "Creating…" : "Create account"}
                </button>
              </div>
              <p className="footer-note" style={{ textAlign: "left", padding: 0 }}>
                Hearts stay on this device until you sign in. Then we merge them with the account. Nothing is
                deleted.
              </p>
            </form>
          )}
          {error ? <p className="settings-error">{error}</p> : null}
          {note ? <p className="lede" style={{ margin: 0 }}>{note}</p> : null}
        </section>

        <section className="settings-panel" aria-labelledby="background-heading">
          <h2 id="background-heading">Background</h2>
          <p className="lede" style={{ margin: 0 }}>
            Black Sparkle is the current glitter. Pink Sparkle and Teal Sparkle use the same shimmer in a new
            color. It covers every page.
          </p>
          <div className="look-grid backgrounds" role="radiogroup" aria-labelledby="background-heading">
            {BACKGROUNDS.map((option) => (
              <label key={option.id} className={`look-option ${background === option.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="beauti-background"
                  value={option.id}
                  checked={background === option.id}
                  onChange={() => setTheme({ ...theme, background: option.id as BackgroundId })}
                />
                <span className={`spark-preview ${option.id}`} aria-hidden="true" />
                <span className="look-copy">
                  <span className="look-name">{option.label}</span>
                  <span className="look-detail">{option.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-panel" aria-labelledby="font-heading">
          <h2 id="font-heading">Font</h2>
          <p className="lede" style={{ margin: 0 }}>
            The choice covers the whole site. Script styles are for headings. Body text stays in a plainer face
            so it stays easy to read.
          </p>
          <div className="look-grid fonts" role="radiogroup" aria-labelledby="font-heading">
            {FONTS.map((option) => (
              <label key={option.id} className={`look-option font-option ${font === option.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="beauti-font"
                  value={option.id}
                  checked={font === option.id}
                  onChange={() => setTheme({ ...theme, font: option.id as FontId })}
                />
                <span className="font-preview-title" style={{ fontFamily: option.serif }}>
                  {option.label}
                </span>
                <span className="font-preview-body" style={{ fontFamily: option.sans }}>
                  {option.sample}
                </span>
                <span className="look-detail">{option.detail}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-panel" aria-labelledby="palette-heading">
          <h2 id="palette-heading">Palette</h2>
          <p className="lede" style={{ margin: 0 }}>
            Main is the accent (buttons, hearts, borders, links). Secondary tints cards, the header, and the
            sparkle. On near-black, dragging hue adds a little saturation and light so the tint can show. Text
            switches between light and dark so it stays readable.
          </p>
          <ColorSlider
            label="Main"
            hint="Buttons, hearts, borders"
            value={theme.main}
            onChange={(main) => setTheme({ ...theme, main })}
          />
          <ColorSlider
            label="Secondary"
            hint="Cards, header, sparkle"
            value={theme.secondary}
            onChange={(secondary) => setTheme({ ...theme, secondary })}
          />
          <button className="ghost-btn" type="button" onClick={resetTheme}>
            Reset to default
          </button>
        </section>
      </div>
    </main>
  );
}
