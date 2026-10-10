import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // One config for the whole monorepo; Next's rules look for the app in apps/web.
  { settings: { next: { rootDir: "apps/web/" } } },
  globalIgnores(["**/.next/**", "**/out/**", "**/build/**", "**/next-env.d.ts"]),
]);

export default eslintConfig;
