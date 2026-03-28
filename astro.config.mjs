// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://learnai.club',
  legacy: {
    collections: true,
  },
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()]
  }
});
