import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
  base: "./",
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      external: ["fs", "path"],
      output: {
        manualChunks: {
          monaco: ["monaco-editor"],
        },
      },
    },
  },
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "info" },
  },
  assetsInclude: [/\.tsp$/],
  optimizeDeps: {
    exclude: ["swagger-ui"],
  },
  logLevel: "info",
  clearScreen: false,
  plugins: [
    (react as any)({
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: ["@emotion/babel-plugin"],
      },
    }),
  ],
  server: {
    fs: {
      strict: false,
    },
  },
});

export default config;
