import { type FormEvent, useState } from "react";
import { ColorSlider } from "../components/ColorSlider";
import { useApp } from "../context/AppContext";

export function SettingsPage() {
  const { user, theme, setTheme, resetTheme, signIn, signUp, signOut } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"signin" | "signup" | "signout" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setNote("Signed out. Hearts and colors stay on this device.");
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
        Create a username to keep your wishlist on more than one device. Palette sliders change accent and
        background colors. Guests keep them on this device. Accounts save them.
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

        <section className="settings-panel" aria-labelledby="palette-heading">
          <h2 id="palette-heading">Palette</h2>
          <p className="lede" style={{ margin: 0 }}>
            Main is the accent (buttons, hearts, borders, links). Secondary is the background. On near-black,
            dragging hue adds a little saturation and light so the tint can show.
          </p>
          <ColorSlider
            label="Main"
            hint="Buttons, hearts, borders"
            value={theme.main}
            onChange={(main) => setTheme({ ...theme, main })}
          />
          <ColorSlider
            label="Secondary"
            hint="Background, cards, header"
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
