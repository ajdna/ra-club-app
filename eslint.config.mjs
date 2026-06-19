import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // React 19 compiler rule: flags synchronous setState inside an effect.
      // We use this deliberately to read browser APIs / DOM on mount (capability
      // detection, theme sync, token verification) — doing it in a lazy state
      // initializer instead would run during SSR and cause hydration mismatches.
      // Kept as a warning so it stays visible without blocking the build.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
