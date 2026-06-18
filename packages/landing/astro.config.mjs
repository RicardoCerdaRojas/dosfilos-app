import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
// NOTA: @astrojs/sitemap 3.x crashea con astro 4.16 (i18n routing → `_routes`
// undefined). El sitemap se mantiene a mano en public/sitemap.xml (rutas pocas
// y controladas + hreflang explícito). Revisar el integration al subir de versión.

// https://astro.build
export default defineConfig({
  site: 'https://preach.dosfilos.com',
  output: 'static',
  trailingSlash: 'always',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    // landing.json (la SSOT del copy) vive en packages/web; permitir leer fuera del root del paquete.
    server: { fs: { allow: ['../..'] } },
  },
});
