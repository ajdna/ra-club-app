import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Ruby Ankur Wellness — Capacitor config
 *
 * Strategy: "Remote URL" mode.
 * Because the app uses Next.js SSR (Server Components, Server Actions), we
 * cannot ship a fully static bundle — the WebView loads the live server instead.
 *
 * DEV   → http://192.168.29.247:3000  (your LAN IP, already in next.config.ts)
 * PROD  → your Vercel URL             (update VERCEL_URL below after deploy)
 *
 * To switch between dev and prod builds, change the `server.url` value below,
 * then run: npx cap sync android
 */

const VERCEL_URL = "https://ra-club-app.vercel.app"; // ← update after deploy
const DEV_URL = "http://192.168.29.247:3000";

const isProd = process.env.NODE_ENV === "production";

const config: CapacitorConfig = {
  appId: "com.rubyankur.clubapp",
  appName: "Ruby Ankur Wellness",

  // webDir is required by Capacitor but only used as fallback when server.url
  // is set. We point it at `public/` which contains our icon + manifest.
  webDir: "public",

  server: {
    // In production CI/CD (NODE_ENV=production), use the Vercel URL.
    // During local dev, use the LAN IP so the Android emulator/device can reach
    // the Next.js dev server running on the same machine.
    url: isProd ? VERCEL_URL : DEV_URL,

    // Allow plain HTTP only in dev. Production must be HTTPS.
    cleartext: !isProd,

    // Supabase auth cookies are set on the Next.js domain, not capacitorapp.com.
    // This prevents a cookie mismatch when the WebView loads your Vercel URL.
    androidScheme: "https",
  },

  android: {
    // Allow mixed content (HTTP assets) only in dev builds.
    allowMixedContent: !isProd,

    // Match your warm-earth theme colour for the native status bar overlay.
    backgroundColor: "#f5f0e6",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#1a5e32", // RA forest green
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark", // dark icons on cream background
      backgroundColor: "#f5f0e6",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
