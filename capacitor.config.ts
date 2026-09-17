import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS app shell for the Beauti SPA.
 *
 * Change the bundle id: set `appId` here, then in Xcode set
 * Signing & Capabilities → Bundle Identifier to the same value,
 * then run `npm run ios:sync` on a Mac.
 */
const config: CapacitorConfig = {
  appId: "com.tdgitdm.beauti",
  appName: "Beauti",
  webDir: "dist-native",
  backgroundColor: "#070707",
  server: {
    // https://localhost is a first-class Capacitor origin (ATS-friendly).
    // Older templates used capacitor://localhost; the Worker allowlists both.
    iosScheme: "https",
    androidScheme: "https",
    hostname: "localhost",
  },
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    scheme: "Beauti",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#070707",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#070707",
    },
  },
};

export default config;
