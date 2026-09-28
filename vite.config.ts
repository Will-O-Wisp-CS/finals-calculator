import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  // HTML・ソース・テストはすべて src/ に置く（公開URLは dist/ 直下の index.html, points.html）
  root: src(''),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: src('index.html'),
        points: src('points.html'),
      },
    },
  },
});
