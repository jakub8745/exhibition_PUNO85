import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  optimizeDeps: {
    include: ['three', 'three-mesh-bvh'],
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      external: [],
      output: {
        format: 'es',
      },
    },
    chunkSizeWarningLimit: 1100,
    sourcemap: process.env.NODE_ENV === 'development',
  },
  server: {
    allowedHosts: ['dac4-46-183-110-17.ngrok-free.app'], // ✅ Allow all hosts (for ngrok)
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
