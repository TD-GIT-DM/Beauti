# Beauti on iOS

The website is unchanged. This repo also ships a Capacitor shell so the same React SPA runs inside an iOS app, with API traffic going to the live Worker:

`https://beauti.tristan-morgenthaler.workers.dev`

This Linux environment cannot open Xcode or talk to App Store Connect. You still need a Mac for Simulator, Archive, and upload. Nobody in this repo can create an Apple ID for you.

## What is already in git

| Path | Role |
| --- | --- |
| `capacitor.config.ts` | App name **Beauti**, bundle id `com.tdgitdm.beauti`, `webDir: dist-native` |
| `vite.capacitor.config.ts` | SPA-only production build (no Cloudflare plugin), `base: './'` |
| `.env.native` | `VITE_NATIVE=1` and `VITE_API_BASE` pointing at the live Worker |
| `resources/` | Dark-gold placeholder icon (1024) + splash (2732) and iOS `.appiconset` |
| `scripts/ios-bootstrap.sh` | One command on a Mac: install, build, `cap add ios` if needed, sync |
| `ios/` | Checked in when `npx cap add ios` succeeds (see below) |

Copied web assets (`ios/App/App/public`) and CocoaPods (`ios/App/Pods`) are gitignored. `npm run ios:sync` recreates them.

## Change the bundle id

1. Set `appId` in `capacitor.config.ts` (example: `com.yourname.beauti`).
2. On a Mac, open Xcode → target **App** → **Signing & Capabilities** → Bundle Identifier. Match `appId`.
3. Run `npm run ios:sync`.

Display name is `appName` in `capacitor.config.ts` (**Beauti**). Xcode `INFOPLIST_KEY_CFBundleDisplayName` should stay in sync after a sync.

## Mac: first run in Simulator

Needs Xcode 16+, Xcode Command Line Tools, CocoaPods (`sudo gem install cocoapods`), and Node 22.

```bash
git clone https://github.com/TD-GIT-DM/Beauti.git
cd Beauti
npm run ios:bootstrap    # or: npm install && npm run ios:sync
npx cap open ios
```

If `ios/` is missing (Linux could not generate it):

```bash
npm run ios:add          # npx cap add ios + icons/plist
npm run ios:sync
npx cap open ios
```

In Xcode:

1. Select the **App** target.
2. Signing: check **Automatically manage signing** and pick **your** Apple team. A free Apple ID can run on Simulator. A paid Apple Developer Program membership is required to Archive for App Store.
3. Pick an iPhone simulator (iPhone 16 is fine).
4. Press Run.

The first launch shows a dark-gold splash, then the same catalog as the website. Search, wishlist, settings, and Ask Beauti call the live Worker.

### Optional: live reload against Vite

```bash
npm run dev
npx cap run ios -l --port 5173
```

That loads `http://<your-mac-lan>:5173` instead of bundled files. The Worker CORS allowlist includes localhost and private LAN origins for this. Ship the store build from `dist-native`, not live reload.

## How the API is wired

| Surface | Frontend assets | `/api/*` |
| --- | --- | --- |
| Website (`npm run deploy`) | Worker static assets | Same origin |
| iOS shell (`npm run build:ios`) | Files inside the app (`dist-native`) | `https://beauti.tristan-morgenthaler.workers.dev` |

`src/api/client.ts` prefixes every fetch with `VITE_API_BASE` when that env is set. Device id still goes on `X-Device-Id`.

### CORS

The iOS WebView origin is `https://localhost` (Capacitor `iosScheme: 'https'`). Older shells used `capacitor://localhost` or `ionic://localhost`. `worker/cors.ts` allowlists those, Vite localhost, private LAN IPs for live reload, and `*.workers.dev`.

Preflight `OPTIONS` is handled in `worker/index.ts` before Hono.

**You must deploy this Worker** (`npm run deploy`) before a device build can sign in or load catalog from a real phone. Until then the live Worker may reject Capacitor origins.

### Cookies vs session header

Website sign-in uses an HttpOnly `beauti_session` cookie (`SameSite=Lax`) because the SPA and API share a host.

The iOS app is a different origin. WKWebView often drops third-party cookies, so:

1. Sign-in / sign-up JSON also returns `sessionId` and `X-Beauti-Session`.
2. The app stores that id in `localStorage` and sends `X-Beauti-Session` on later calls.
3. Cross-site `Set-Cookie` uses `SameSite=None; Secure` when the Origin is allowlisted, in case the WebView keeps the cookie.

Guest wishlist still keys off `X-Device-Id` (and a `beauti_device` cookie when the WebView accepts it).

Retailer links open in Safari View Controller via `@capacitor/browser` so the WebView does not navigate away from the app.

## iOS chrome (status bar, safe area, ATS, splash)

Set in `capacitor.config.ts` and applied to `Info.plist` by `scripts/apply-ios-branding.py`:

- Status bar: light content on `#070707`
- `viewport-fit=cover` (already in `index.html`)
- CSS `env(safe-area-inset-*)` on header, pages, Ask Beauti FAB
- `NSAppTransportSecurity` does **not** allow arbitrary HTTP. Catalog, fonts, and the Worker are HTTPS.
- Splash and App Icon: dark gold “B” placeholders in `resources/`. Replace `resources/icon.png` (1024×1024, no alpha for the store 1024) and `resources/splash.png`, then `npm run ios:assets`.

The 1024×1024 App Store icon must not use transparency. The generator writes an opaque background.

## Archive for App Store (Mac + paid account)

This is **your** checklist. This project cannot log into Apple.

1. Join [Apple Developer Program](https://developer.apple.com/programs/) (~$99/year) with **your** Apple ID.
2. In [App Store Connect](https://appstoreconnect.apple.com) create an app:
   - Name: Beauti
   - Bundle ID: `com.tdgitdm.beauti` (register it under Certificates, Identifiers & Profiles if it is not listed)
   - SKU: `beauti` (any unique string)
3. Xcode → target App → Signing & Capabilities → your **Team**.
4. `npm run ios:sync` so `dist-native` is current.
5. Xcode menu **Product → Destination → Any iOS Device**.
6. **Product → Archive**.
7. Organizer → **Distribute App → App Store Connect → Upload**.
8. In App Store Connect, finish the listing (`docs/app-store-listing.md`), privacy nutrition labels, screenshots, and submit for review.

Export compliance: `ITSAppUsesNonExemptEncryption` is `false` (HTTPS only; password hashing is on the Worker). Confirm that still matches if you add custom crypto.

## Privacy manifest

`scripts/apply-ios-branding.py` writes `ios/App/App/PrivacyInfo.xcprivacy` if missing:

- No tracking
- User ID (the in-app username / device id) for app functionality
- Product interaction (wishlist, advisor) for app functionality
- UserDefaults (CA92.1) because Capacitor / the SPA persist theme, device id, and session

Edit this if you add analytics or ads.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Blank WebView | `npm run build:ios` produced `dist-native/index.html`, then `npx cap sync ios` |
| Catalog fails in the app | Deploy the CORS Worker; confirm the phone can reach `https://beauti.tristan-morgenthaler.workers.dev/api/health` |
| Sign-in does not stick | `X-Beauti-Session` path; do not block `localStorage` |
| CocoaPods error on Linux | Expected. Run `npm run ios:add` on a Mac |
| Bundle id mismatch | `appId` vs Xcode vs App Store Connect must be identical |
