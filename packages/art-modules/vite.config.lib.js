import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  build: {
    // Library mode configuration
    lib: {
      entry: 'src/index.js',       // Path to your module entry
      name: 'ArtModules',          // Global variable name for UMD builds (if needed)
      formats: ['es', 'cjs'],      // Output formats: ES modules and CommonJS
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      // Exclude peer dependencies from the bundle
      external: ['three', 'three-mesh-bvh'],
      output: {
        // Preserve module structure in ES build
        preserveModules: true,
        preserveModulesRoot: 'src'
      },
      // Suppress "unused external import" warnings for three
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      }
    },
    // Emit sourcemaps for easier debugging
    sourcemap: true
  },
  plugins: [
    // Copy static assets (e.g. loader libraries) into the dist folder
    viteStaticCopy({
      targets: [
        {
          // Copy Basis transcoder files (JS & WASM) from root node_modules
          src: path.resolve(__dirname, '../../node_modules/three/examples/jsm/libs/basis/*'),
          dest: 'libs/basis',
          errorOnMissing: false,
          flatten: false
        },
        {
          // Copy Draco decoder files from root node_modules
          src: path.resolve(__dirname, '../../node_modules/three/examples/jsm/libs/draco/*'),
          dest: 'libs/draco',
          errorOnMissing: false,
          flatten: false
        }
      ]
    })
  ]
});
