// src/modules/AppBuilder.js

import initRenderer from './initRenderer.js';
import initScene from './initScene.js';
import initCamera from './initCamera.js';
import initControls from './initControls.js';
import ModelLoader from './ModelLoader.js';
import { createVideoMeshes } from './createVideoMeshes.js';
import { PointerHandler } from './PointerHandler.js';
import galleryConfig from '../config/gallery_config.json';

import { AmbientLight, Clock, BufferGeometry, Mesh, OrthographicCamera, WebGLRenderer, Vector3 } from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

import Visitor from './Visitor.js';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree
} from 'three-mesh-bvh';


const ktx2Loader = new KTX2Loader().setTranscoderPath('./libs/basis/');
const clock = new Clock();
const cameraDirection = new Vector3();


export async function buildGallery(config) {
  const { modelPath, backgroundTexture, visitorStart, enablePostProcessing } = config;

  // Patch Three.js for BVH support
  Mesh.prototype.raycast = acceleratedRaycast;
  BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

  // Setup core
  const renderer = initRenderer();

  const scene = initScene(backgroundTexture, renderer);
  scene.name = 'mainScene';
  scene.add(new AmbientLight(0xffffff, 2));

  const camera = initCamera();

  let bacgroundMap;
  const rendererMap = new WebGLRenderer();
  rendererMap.setClearColor(0x142236);
  rendererMap.setSize(500, 500);

  const sceneMap = initScene(bacgroundMap, rendererMap);
  sceneMap.name = 'sceneMap';
  sceneMap.add(new AmbientLight(0xffffff, 2));
  
  const aspect = 1; // Square map
  const size = 40;
  
  const cameraMap = new OrthographicCamera(
    -size * aspect,
    size * aspect,
    size,
    -size,
    0.1,
    1000
  );
  
  cameraMap.position.set(10, 50, 10);
  cameraMap.up.set(0, 0, -1); // Z is "up" for minimap rotation if needed
  cameraMap.lookAt(0, 0, 0);
  


  const controls = initControls(camera, renderer.domElement);

  // CSS2DRenderer for DOM elements
    const css2DRenderer = new CSS2DRenderer();
    css2DRenderer.setSize(500, 500);
    css2DRenderer.domElement.style.position = 'absolute';
    css2DRenderer.domElement.style.top = '0';
    css2DRenderer.domElement.style.pointerEvents = 'none'; 

  const deps = {
    ktx2Loader,
    camera,
    controls,
    scene,
    sceneMap,
    cameraMap,
    renderer,
    rendererMap,
    css2DRenderer,
    params: {
      gravity: -70,
      visitorSpeed: 10,
      heightOffset: { x: 0, y: 3.5, z: 0 },
      enablePostProcessing,
    },
  };

  const visitor = new Visitor(deps);
  deps.visitor = visitor;
  scene.add(visitor);

  const popupCallback = setupModal();
  new PointerHandler({ camera, scene, visitor, popupCallback, deps });

  const modelLoader = new ModelLoader(deps, scene);
  await modelLoader.loadModel(modelPath);
  createVideoMeshes(scene);
  scene.updateMatrixWorld(true);
  visitor.reset();

  addSidebarListeners();
  setupSidebarButtons(deps);

  function animateMap() {
    requestAnimationFrame(animateMap);
  
    camera.getWorldDirection(cameraDirection);
    const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
    sceneMap.rotation.y = -angle + Math.PI;
  
    sceneMap.updateMatrixWorld();
  
    rendererMap.render(sceneMap, cameraMap);
    css2DRenderer.render(sceneMap, cameraMap);
  }

  function animate() {
    requestAnimationFrame(animate);
    //const delta = clock.getDelta();
    const delta = Math.min(clock.getDelta(), 0.1); // Prevent weird physics when tab is inactive


    if (deps.visitor && deps.collider) deps.visitor.update(delta, deps.collider);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  animateMap();

  hideOverlay();
  console.log('Gallery initialized');
}
function setupModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const modal = modalOverlay.querySelector('.modal');
  const modalImg = modalOverlay.querySelector('img');
  const modalDesc = modalOverlay.querySelector('.modal-description');
  const closeBtn = document.getElementById('closeModal');

  // Close modal on click outside
  modalOverlay.addEventListener('pointerdown', (e) => {
    if (!modal.contains(e.target)) {
      modalOverlay.classList.add('hidden');
      modalOverlay.classList.remove('show');
      modalImg.src = '';
      modalDesc.textContent = '';
    }
  });

  // Prevent scroll inside modal from closing it
  ['touchstart', 'touchmove'].forEach(evt => {
    modalDesc.addEventListener(evt, e => {
      e.stopPropagation();
    }, { passive: true });
  });

  closeBtn.addEventListener('click', () => {
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('show');
    modalImg.src = '';
    modalDesc.textContent = '';
    modalDesc.scrollTop = 0;
  });

  makeModalDraggable(modal);


  return function showModal(userData) {
    if (!userData) return;
    if (userData.Map) modalImg.src = userData.Map;
    if (userData.opis) modalDesc.textContent = userData.opis;

    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('show');

    setTimeout(() => {
      modalDesc.scrollTop = 0;
    }, 50);
  };


}
function makeModalDraggable(modal) {
  const dragHandle = modal.querySelector('.modal-image-container') || modal;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const startDrag = (e) => {
    if (e.target.closest('.modal-description')) return; // Don't drag when scrolling text

    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = (e.clientX || e.touches[0].clientX) - rect.left;
    offsetY = (e.clientY || e.touches[0].clientY) - rect.top;

    modal.style.transition = 'none';
    modal.style.position = 'absolute';
    modal.style.zIndex = 1001;

    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', stopDrag);
  };

  const onDrag = (e) => {
    if (!isDragging) return;

    const x = (e.clientX || e.touches[0].clientX) - offsetX;
    const y = (e.clientY || e.touches[0].clientY) - offsetY;

    modal.style.left = `${x}px`;
    modal.style.top = `${y}px`;
    modal.style.margin = '0';
  };

  const stopDrag = () => {
    isDragging = false;
    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', stopDrag);
  };

  dragHandle.style.cursor = 'grab';
  dragHandle.addEventListener('pointerdown', startDrag);
}



function buildSidebar(sidebarConfig) {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const navList = sidebar.querySelector('.nav-list');
  const logoDiv = sidebar.querySelector('.logo_name');
  logoDiv.textContent = sidebarConfig.logo.text;

  sidebarConfig.items.forEach(item => {
    const li = document.createElement('li');
    if (item.link) {
      li.innerHTML = `
        <a href="${item.link}" target="_blank">
          <span class="links_name">
            <img src="${item.icon}" />${item.label}
          </span>
        </a>`;
    } else {
      li.innerHTML = `
        <a href="#" id="${item.id}" data-divid="${item.target}">
          <span class="links_name">
            <img src="${item.icon}" />${item.label}
          </span>
        </a>
        <div class="info_sidebar" id="${item.target}">
          <span class="info_text">${item.content}</span>
        </div>`;
    }
    navList.appendChild(li);
  });

  sidebar.style.display = 'block';
  sidebar.style.animation = 'fadeIn 2s forwards';
  document.querySelector(".sidebar").classList.toggle("open");
  document.querySelector("#btn").classList.toggle("open");
}

function addSidebarListeners() {
  const sidebar = document.querySelector(".sidebar");
  ["pointerdown", "mousedown", "touchstart"].forEach((type) => {
    sidebar?.addEventListener(type, (e) => e.stopPropagation());
  });

  document.querySelector("#btn")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    sidebar?.classList.toggle("open");
    document.querySelector("#btn")?.classList.toggle("open");
  });
}

function setupSidebarButtons(deps) {
  document.querySelectorAll("[data-divid]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const divID = btn.getAttribute("data-divid");
      if (!divID) return;

      const targetDiv = document.getElementById(divID);
      const isAlreadyOpen = targetDiv?.classList.contains("open");

      // Close all .info_sidebar sections
      document.querySelectorAll(".info_sidebar").forEach(div => {
        div.classList.remove("open");
      });

      // Re-open if it wasn't already open
      if (targetDiv && !isAlreadyOpen) {
        targetDiv.classList.add("open");

        if (divID.includes("map") && deps.sceneMap) {
          targetDiv.innerHTML = "";
          const canvas = deps.rendererMap.domElement;
          targetDiv.appendChild(canvas);
        }
        
      }
    });
  });
}



function hideOverlay() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.style.transition = 'opacity 1s ease';
    overlay.style.opacity = 0;
    setTimeout(() => overlay.style.display = 'none', 1000);
  }
}

// Initial sidebar build
if (galleryConfig.sidebar) {
  document.addEventListener('DOMContentLoaded', () => buildSidebar(galleryConfig.sidebar));
}
