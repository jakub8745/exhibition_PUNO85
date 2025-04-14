// src/modules/AppBuilder.js

import initRenderer from './initRenderer.js';
import initScene from './initScene.js';
import initCamera from './initCamera.js';
import initControls from './initControls.js';
import ModelLoader from './ModelLoader.js';
import { createVideoMeshes } from './createVideoMeshes.js';
import { PointerHandler } from './PointerHandler.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';



import { AmbientLight } from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import Visitor from './Visitor.js';
import { Clock, BufferGeometry, Mesh } from 'three';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';


const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('./libs/basis/'); // Adjust to your path
const clock = new Clock();


export async function buildGallery(config) {
  const { modelPath, backgroundTexture, visitorStart, enablePostProcessing } = config;

  // Patch Three.js prototypes for BVH support
  Mesh.prototype.raycast = acceleratedRaycast;
  BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;



  // Step 1: Initialize renderer
  const renderer = initRenderer();

  // Step 2: Setup scene
  const scene = initScene(backgroundTexture, renderer);

  // After scene is created:
  const ambientLight = new AmbientLight(0xffffff, 2); // white, intensity 2
  scene.add(ambientLight);

  // Step 3: Setup camera and controls
  const camera = initCamera();
  const controls = initControls(camera, renderer.domElement);



  // Step 4: Create shared deps object
  const deps = {
    ktx2Loader,
    camera,
    controls,
    scene,
    renderer,
    params: {
      gravity: -70,
      visitorSpeed: 10,
      heightOffset: { x: 0, y: 3.5, z: 0 },//y:4.5
      enablePostProcessing,
    },
  };

  // after deps is prepared
  const visitor = new Visitor(deps);
  //visitor.position.set(5, 10, 5);
  scene.add(visitor);

  const popupCallback = setupModal(); // returns the function to show the modal

  const pointerHandler = new PointerHandler({
    camera,
    scene,
    visitor,
    popupCallback,
    deps
  });
  
  

  deps.visitor = visitor;


  // Step 6: Load model environment
  const modelLoader = new ModelLoader(deps, scene);
  await modelLoader.loadModel(modelPath);

  createVideoMeshes(scene); // ✅ add video planes after model load

  scene.updateMatrixWorld(true);
  visitor.reset();

  

  // Step 7: Start render loop
  function animate() {

    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (deps.visitor && deps.collider) {
      deps.visitor.update(delta, deps.collider);
    }

    //TWEEN.update();

    controls.update();

    renderer.render(scene, camera);
  }
  animate();

  console.log('Gallery initialized');
}

function setupModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const modalImg = modalOverlay.querySelector('img');
  const modalDesc = modalOverlay.querySelector('.modal-description');
  const closeBtn = document.getElementById('closeModal');

  closeBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('show');

    modalImg.src = '';
    modalDesc.textContent = '';
  });

  return function showModal(userData) {
    if (!userData) return;

    if (userData.Map) {
      modalImg.src = userData.Map;
    }
    if (userData.opis) {
      modalDesc.textContent = userData.opis;
    }

    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('show');
  };
}

function popupCallback(userData) {
  console.log('🟡 Popup triggered:', userData);
  // TODO: Connect to modal logic here
}
