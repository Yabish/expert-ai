// Shared Vitest settings. Packages call createVitestConfig() from their
// vitest.config.ts and may raise coverage thresholds (the query guard
// requires 100% branches, SPEC §9.4).
import { defineConfig } from "vitest/config";

/**
 * @param {{ thresholds?: { branches?: number, functions?: number, lines?: number, statements?: number } }} [options]
 */
export function createVitestConfig(options = {}) {
  return defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.ts"],
        exclude: ["src/**/*.test.ts"],
        reporter: ["text-summary", "lcov"],
        thresholds: options.thresholds ?? {},
      },
    },
  });
}
