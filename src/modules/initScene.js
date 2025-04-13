// src/modules/initScene.js
import { Scene, Color, EquirectangularReflectionMapping, SRGBColorSpace } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';


const ktx2Loader = new KTX2Loader().setTranscoderPath('./libs/basis/');

export default function initScene(backgroundTexture, renderer) {
  const scene = new Scene();
  scene.background = new Color(0xffffff); // fallback background

  if (backgroundTexture) {
    ktx2Loader.detectSupport(renderer); // requires renderer to be global or passed in
    ktx2Loader.load(backgroundTexture, (texture) => {
      texture.mapping = EquirectangularReflectionMapping;
      texture.colorSpace = SRGBColorSpace;
      scene.background = texture;
    });
  }

  return scene;
}
