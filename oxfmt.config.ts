import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 120,
  jsdoc: false,
  ignorePatterns: ["**/*.d.ts", "dist"],
  sortImports: true,
});
