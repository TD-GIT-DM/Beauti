#!/usr/bin/env bash
# One-step Mac bootstrap for the Beauti iOS shell.
# Safe to re-run. Does not require an Apple ID until you Archive / Device run.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script generates/syncs the Xcode project. Full iOS build needs a Mac with Xcode."
  echo "On Linux we still generate icons and the web bundle; \`npx cap add ios\` is attempted."
fi

npm install
python3 scripts/generate-ios-assets.py
npm run build:ios

if [[ ! -d ios/App ]]; then
  echo "Adding the Capacitor iOS platform (first run)…"
  npx cap add ios
fi

npx cap sync ios
python3 scripts/apply-ios-branding.py

echo
echo "Next on a Mac:"
echo "  npx cap open ios"
echo "Then pick an iPhone simulator and press Run."
echo "App Store upload still needs your Apple Developer Program membership (see docs/ios.md)."
