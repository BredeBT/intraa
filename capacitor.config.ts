import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Intraa native app — Capacitor-konfig.
 *
 * Strategi: Server-URL wrapper (Option A).
 * Appen åpner et WebView som peker direkte til https://intraa.net, slik at
 * vi får alle server components / server actions / Prisma uten å re-skrive
 * appen til static export. Som Substack, Patreon m.fl. gjorde initialt.
 *
 * Senere: hvis vi vil ha "true offline" eller raskere kald start, kan vi
 * gå over til en hybrid løsning hvor login-/onboarding-flyten ligger
 * native-bundled.
 *
 * For lokal utvikling: kommenter ut `server.url` så Capacitor bruker
 * `webDir` (du må da kjøre `next build && next export` eller pek webDir
 * til en kjørende dev-server).
 */
const config: CapacitorConfig = {
  appId:    "net.intraa.app",
  appName:  "Intraa",
  webDir:   "out", // brukes hvis server.url ikke er satt
  server: {
    url:                 "https://intraa.net",
    cleartext:           false,            // krev HTTPS (App Store-krav uansett)
    androidScheme:       "https",
    allowNavigation:     ["intraa.net", "*.intraa.net"],
  },
  ios: {
    contentInset:           "always",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor:        "#0d0d14",
  },
  android: {
    backgroundColor:        "#0d0d14",
    allowMixedContent:      false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration:  1500,
      backgroundColor:     "#0d0d14",
      androidSplashResourceName: "splash",
      showSpinner:         false,
    },
    StatusBar: {
      style:           "DARK",
      backgroundColor: "#0d0d14",
      overlaysWebView: false,
    },
  },
};

export default config;
