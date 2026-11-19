import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies unbundled images and the source favicon into Vercel's public CDN tree.
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const publicDir = path.resolve(__dirname, 'public');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const publicAssets = path.resolve(publicDir, 'src/assets');
          const favicon = path.resolve(__dirname, 'favicon.ico');
          if (fs.existsSync(publicDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, publicAssets, {recursive: true, force: true});
          }
          if (fs.existsSync(publicDir) && fs.existsSync(favicon)) {
            fs.copyFileSync(favicon, path.resolve(publicDir, 'favicon.ico'));
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // Vercel's Express deployment serves public/** through its CDN.
    publicDir: false as const,
    build: {
      outDir: 'public',
      emptyOutDir: true,
    },
  };
});
