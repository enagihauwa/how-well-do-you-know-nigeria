import { defineConfig } from "vitest/config";

// `npm test` at the root runs every workspace's tests in one go; each has its own config.
export default defineConfig({
  test: {
    projects: ["packages/game", "apps/server", "apps/web"],
  },
});
