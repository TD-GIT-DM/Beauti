# App Store listing draft (Beauti)

Use this in App Store Connect. It is a draft. Replace screenshots, support URL, and privacy policy URL with yours. Nobody here can create those Apple records for you.

## Name

Beauti

(30 character limit. This fits.)

## Subtitle

Beauty deals, wishlist, restock alerts

(30 character limit.)

## Promotional text (optional, 170 characters)

Track real markdowns, save a wishlist, and get restock notes. Ask Beauti for catalog-only product picks. Retailer prices, not invented coupons.

## Description

Beauti is a dark, quiet catalog of beauty products with honest prices.

Browse a short list of real markdowns on the home screen. Search by brand, product name, or description. Save a wishlist. Turn on in-app restock and price-drop notes for the items you heart.

Ask Beauti is an on-device chat that only recommends products already in this catalog. It is product matching, not medical advice, and it will not invent items that are not in the list.

Prices and stock follow the retailer or brand page we link to. We do not invent percent-off badges from fake promo codes. When a product is out of stock, Beauti keeps it visible and shows a restock estimate if we have one.

Create an optional username to sync your theme and wishlist. Guest mode keeps hearts on this device.

Shop links open the retailer or brand page so you can buy there. Beauti does not process payments.

## Keywords (100 characters, comma-separated)

beauty,makeup,skincare,perfume,deals,wishlist,sephora,restock,lipstick,fragrance

(96 characters.)

## What's New (1.0)

First App Store release. Catalog browse, search, wishlist, restock notes, theme, and Ask Beauti.

## Version

1.0.0

## Category

Primary: Lifestyle
Secondary: Shopping

## Content rating

No objectionable content. No user-generated public feeds. Account is a username and password you choose.

Suggested Apple age rating: 4+ (confirm in the questionnaire).

## Support URL

https://beauti.tristan-morgenthaler.workers.dev

Replace with a dedicated support page if you have one.

## Marketing URL (optional)

https://beauti.tristan-morgenthaler.workers.dev

## Privacy policy URL

Required by App Store Connect. Publish a short page that matches the nutrition labels below, then paste that URL here. This repo does not host that page yet.

## App Review notes

Demo account: create one in the app (Settings) or use guest mode. No payment is required. Ask Beauti only answers from the in-app catalog. Retailer sites open in an in-app Safari view.

Contact email: use your own. This project cannot supply an Apple ID.

## Screenshots you still need (you take these on a Mac simulator)

App Store Connect wants several sizes. Minimum for iPhone:

- 6.7" display (iPhone 16 Pro Max / 15 Pro Max), portrait
- 6.5" or 5.5" if Apple still lists them in the form

Capture at least:

1. Home: full-bleed product with a real markdown
2. Search with filters and results
3. Product detail with price and View retailer
4. Wishlist
5. Ask Beauti open with a catalog reply
6. Settings / theme

Do not overlay fake star ratings or “#1 app” banners. Apple rejects that.

## Privacy nutrition labels (App Privacy)

Answer these in App Store Connect to match the current app. Update if you add analytics, ads, or crash reporters.

### Data not used for tracking

This app does not track users across other companies’ apps or websites. Tracking is false.

### Data linked to the user’s identity (only if they create an account)

| Type | Used for | Linked | Tracking |
| --- | --- | --- | --- |
| User ID (username you choose) | App functionality (sign-in, theme sync, wishlist) | Yes, to that account | No |
| Password | Account security, sent to our server over HTTPS. Apple’s form may list this under Other Data Types / sensitive info depending on the year of the questionnaire. Do not claim you collect government ID. | Yes | No |

### Data not linked to identity (guest and signed-in)

| Type | Used for | Linked | Tracking |
| --- | --- | --- | --- |
| Product interaction (hearts, search, Ask Beauti questions) | App functionality | No for guests. Yes if signed in (wishlist is on the account). | No |
| Device ID (random id stored on device) | App functionality (guest wishlist and restock notes) | No | No |
| Crash data | Not collected unless you later add a reporter | n/a | n/a |
| Diagnostics / performance | Not collected | n/a | n/a |
| Purchases | Not collected. Checkout happens on retailer sites. | n/a | n/a |
| Location | Not collected | n/a | n/a |
| Contacts, photos, health, financial info | Not collected | n/a | n/a |
| Email | Not collected in this version | n/a | n/a |

### Third-party data

- Cloudflare Worker + D1 host the catalog, accounts, and wishlist.
- Product photos load from the brand or retailer CDN already stored on each product.
- Shop links open Sephora, Ulta, or brand sites. Those sites have their own privacy policies.
- Fonts may load from Google Fonts over HTTPS.

No advertising SDK. No analytics SDK in this version.

### Privacy responses to copy

“We collect a username and password if you create an account, plus a random device id for guest wishlists. We use that to run the catalog, wishlist, restock notes, and theme. We do not sell data. We do not use it to track you in other apps.”

## Encryption / export compliance

HTTPS only. Account passwords are hashed on the server. Set “No, we do not use encryption except HTTPS” unless you add extra crypto later. The Xcode project sets `ITSAppUsesNonExemptEncryption` to false.

## Review attachments

None required. If review cannot load the catalog, tell them the app needs network access to `https://beauti.tristan-morgenthaler.workers.dev`.
