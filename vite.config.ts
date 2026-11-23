import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  envPrefix: ["VITE_", "PUBLIC_"],
  resolve: {
    dedupe: [
      "prosemirror-view",
      "prosemirror-state",
      "prosemirror-model",
      "prosemirror-transform",
      "@tiptap/pm",
      "@tiptap/core",
      "solid-js",
    ],
  },
  server: {
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  optimizeDeps: {
    include: ["@jridgewell/resolve-uri"],
    exclude: [
      "solid-js",
      "solid-js/web",
      "solid-js/store",
      "solid-js/html",
      "solid-js/h",
      "@solidjs/start",
      "@solidjs/router",
      "@solid-primitives/i18n",
      "lucide-solid",
    ],
  },
  plugins: [
    solidStart(),
    tailwindcss(),
    nitro(),
  ],
});
