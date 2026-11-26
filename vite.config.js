import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained dist/index.html (JS + CSS + fonts inlined) that also opens
// straight from disk; photos and textures stay as files in dist/assets.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: { target: 'es2020', assetsInlineLimit: 0, cssCodeSplit: false },
  server: { port: 5173 },
});
