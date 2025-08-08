import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(__dirname, "src");
const outDir = resolve(__dirname, "dist");

// https://vitejs.dev/config/
export default defineConfig({
  root,
  plugins: [react()],
  build: {
    outDir,
    emptyOutDir: true,
    chunkSizeWarningLimit: 2048,
    target: "es2020", // Support BigInt and modern JS features
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        about: resolve(root, "about", "index.html"),
        create: resolve(root, "create", "index.html"),
        explore: resolve(root, "explore", "index.html"),
      }
    }
  },
  esbuild: {
    target: "es2020" // Ensure esbuild also uses modern target
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "es2020" // For dependency optimization
    }
  }
});
