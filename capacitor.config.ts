import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Untitled Trust Builder — Capacitor (Android / iOS) config.
 *
 * This app is 100% client-side: the entire questionnaire, plan generator, and
 * PDF engine run on-device with no backend. Capacitor simply bundles the static
 * Vite build (dist/public) into the native shell — no server URL required.
 */
const config: CapacitorConfig = {
  appId: "com.koshkikode.trustbuilder",
  appName: "Untitled Trust Builder",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
