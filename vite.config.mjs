import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';


export default defineConfig({
  optimizeDeps: {
    include: ['three', 'three-mesh-bvh'], // Combine the packages into a single array
  },
  assetsInclude: ['**/*.wasm'], // Ensures .wasm files are included in the build
  build: {
    rollupOptions: {
      external: [], // All dependencies will be bundled
      output: {
        format: 'es', // Use ES modules in the output
      },
    },
    chunkSizeWarningLimit: 1100, // Set chunk size warning to 1 MB
    sourcemap: process.env.NODE_ENV === 'development', // Enable source maps in development
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/three/examples/jsm/libs/basis/*',
          dest: 'libs/basis', // Copies Basis files to 'dist/libs/basis/'
        },
        {
          src: 'node_modules/three/examples/jsm/libs/draco/*',
          dest: 'libs/draco', // Copies Draco files to 'dist/libs/draco/'
        },
      ],
    }),
  ],
});




