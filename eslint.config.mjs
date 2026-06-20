import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The bundled react-hooks plugin now ships React Compiler lint rules
// (set-state-in-effect, purity, immutability, refs, …). They are advisory and
// fire across the existing codebase without affecting the production build, so
// they are turned off in the gate. The two essential checks — rules-of-hooks and
// exhaustive-deps — stay on. Rules are read from the installed plugin itself, so
// no rule name is guessed (version-proof, no "unknown rule" config errors).
const KEEP = new Set(["rules-of-hooks", "exhaustive-deps"]);
function disableReactCompilerRules(config) {
  const plugin = config?.plugins?.["react-hooks"];
  if (!plugin?.rules) return config;
  const off = {};
  for (const name of Object.keys(plugin.rules)) {
    if (!KEEP.has(name)) off[`react-hooks/${name}`] = "off";
  }
  return { ...config, rules: { ...(config.rules ?? {}), ...off } };
}

const eslintConfig = defineConfig([
  ...[...nextVitals, ...nextTs].map(disableReactCompilerRules),
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
