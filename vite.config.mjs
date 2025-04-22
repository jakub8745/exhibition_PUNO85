import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  // Disable the deps optimizer’s auto‑discovery and specify packages to include
  optimizeDeps: {
    noDiscovery: true,
    include: ['three', 'three-mesh-bvh'],
    exclude: []
  },

  // Include WASM assets
  assetsInclude: ['**/*.wasm'],

  build: {
    rollupOptions: {
      // Treat any HTTP(S) import as external so it remains a runtime fetch
      external: (id) => /^https?:\/\//.test(id),
      output: {
        format: 'es',
      }
    },
    chunkSizeWarningLimit: 1100,
    sourcemap: process.env.NODE_ENV === 'development',
  },

  server: {
    // Allow specific hosts (e.g., for ngrok)
    allowedHosts: ['df9a-193-160-246-9.ngrok-free.app'],
  },

  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/three/examples/jsm/libs/basis/*',
          dest: 'libs/basis',
        },
        {
          src: 'node_modules/three/examples/jsm/libs/draco/*',
          dest: 'libs/draco',
        },
      ],
    }),
  ],
});
