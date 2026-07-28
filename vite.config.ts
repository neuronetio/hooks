import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [babel({ plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]] })],
});
