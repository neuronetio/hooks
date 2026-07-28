import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "oxc"],
  categories: {
    correctness: "error",
  },
  rules: {
    "eslint/no-console": "error",
    "eslint/no-unused-vars": "warn",
    "no-unused-labels": "allow",
    "unicorn/no-new-array": "allow",
    "no-warning-comments": [
      "warn",
      {
        terms: ["TODO", "FIXME"],
        location: "start",
      },
    ],
  },
  env: {
    builtin: true,
  },
  ignorePatterns: ["**/*.d.ts", "dist"],
});
