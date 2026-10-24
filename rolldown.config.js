import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

export default defineConfig([
  {
    tsconfig: "tsconfig.json",
    input: "src/index.ts",
    output: {
      dir: "dist",
      cleanDir: true,
      minify: false,
      preserveModules: true,
    },
    plugins: [
      dts({
        tsgo: true,
        tsconfig: "tsconfig.json",
      }),
    ],
    transform: { dropLabels: ["EXAMPLE", "PLAYGROUND"] },
  },
  {
    tsconfig: "tsconfig.json",
    input: "src/index.ts",
    output: {
      entryFileNames: "[name].min.js",
      chunkFileNames: "[name].min.js",
      dir: "dist",
      cleanDir: false,
      minify: true,
      preserveModules: true,
    },
    plugins: [
      dts({
        tsgo: true,
        tsconfig: "tsconfig.json",
      }),
    ],
    transform: { dropLabels: ["EXAMPLE", "PLAYGROUND"] },
  },
]);
