// Entry point for shared art-modules library
// Re-export all modules for easy imports
// at the bottom of src/index.js

export { default as initRenderer } from './modules/initRenderer.js';
export { default as initScene } from './modules/initScene.js';
export { default as initCamera } from './modules/initCamera.js';
export { default as initControls } from './modules/initControls.js';
export { default as ModelLoader } from './modules/ModelLoader.js';
export { setupResizeHandler } from './modules/resizeHandler.js';
export { createVideoMeshes } from './modules/createVideoMeshes.js';
export { PointerHandler } from './modules/PointerHandler.js';
export { default as Visitor } from './modules/Visitor.js';
export { buildGallery } from './modules/AppBuilder.js';
export { preloadConfigAssets } from './modules/preloadConfigAssets.js';
export { default as initMapRenderer } from './modules/initMapRenderer.js'
export { addSidebarListeners } from './modules/sidebar.js';
export { default as rotateOrbit } from './modules/rotateOrbit.js';
export { setupModal } from './modules/setupModal.js';

// Optionally re-export three-mesh-bvh helpers if you want them bundled
// export { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
