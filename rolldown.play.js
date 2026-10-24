import babel from "@rolldown/plugin-babel";
import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

export default defineConfig([
  {
    tsconfig: "tsconfig.json",
    input: "playground/src/index.ts",
    output: {
      entryFileNames: "[name].js",
      dir: "playground/dist",
      cleanDir: true,
      minify: false,
      preserveModules: true,
    },
    plugins: [
      dts({
        tsgo: true,
        tsconfig: "tsconfig.json",
      }),
      babel({
        plugins: [
          [
            "@babel/plugin-proposal-decorators",
            {
              version: "2023-11",
            },
          ],
        ],
      }),
    ],
    transform: { dropLabels: ["EXAMPLE", "PLAYGROUND"] },
  },
]);
