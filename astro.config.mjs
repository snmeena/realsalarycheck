import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  base: '/',
  vite: {
    plugins: [tailwind()]
  }
});
