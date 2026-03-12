// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

export default defineConfig({
  legacy: {
    collections: true,
  },
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()]
  }
});