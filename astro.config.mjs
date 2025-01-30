import { defineConfig } from 'astro/config';
import jopSoftwarecookieconsent from '@jop-software/astro-cookieconsent';
// https://astro.build/config
export default defineConfig({
  integrations: [jopSoftwarecookieconsent()]
});