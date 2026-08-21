import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 120,
  proseWrap: "always",
  jsdoc: false,
  ignorePatterns: ["**/*.d.ts", "dist"],
  sortImports: true,
});
