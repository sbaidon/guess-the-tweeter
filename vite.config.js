import { defineConfig } from "vite";
import tsrxReact from "@tsrx/vite-plugin-react";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsrxReact(), react()],
});
