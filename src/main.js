// vite_web3_gallery_template/main.js
import { buildGallery } from './modules/AppBuilder.js';
import galleryConfig from './config/gallery_config.json';

// Main entry: build app dynamically from gallery config
(async () => {
  try {
    await buildGallery(galleryConfig);
  } catch (err) {
    console.error('Error initializing gallery:', err);
  }
})();
