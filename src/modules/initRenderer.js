// src/modules/initRenderer.js
import { WebGLRenderer, PCFSoftShadowMap, ACESFilmicToneMapping, SRGBColorSpace } from 'three';

export default function initRenderer() {
  const renderer = new WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  document.body.appendChild(renderer.domElement);
  return renderer;
}
