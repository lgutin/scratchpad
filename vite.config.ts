import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/scratchpad/",
  plugins: [
    react(),
    // Tailwind v4 is used ONLY by the landing page (src/landing/landing.css),
    // which imports Tailwind's theme + utilities layers WITHOUT preflight so it
    // never resets or leaks styles into the Anvil2 experiments.
    tailwindcss(),
    svgr({
      include: "**/*.svg",
      svgrOptions: {
        svgoConfig: {
          plugins: [
            {
              name: "preset-default",
              params: {
                overrides: {
                  removeViewBox: false,
                },
              },
            },
          ],
        },
      },
    }),
  ],
});
