import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: { alias: { "server-only": path.resolve(__dirname, "tests/support/empty.ts") } },
  test: {
    environment: "node",
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
