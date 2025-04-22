// src/modules/AppBuilder.js

import initRenderer from './initRenderer.js';
import initScene from './initScene.js';
import initCamera from './initCamera.js';
import initControls from './initControls.js';
import ModelLoader from './ModelLoader.js';
import { setupResizeHandler } from './resizeHandler.js';
import { createVideoMeshes } from './createVideoMeshes.js';
import { PointerHandler } from './PointerHandler.js';
import { AmbientLight, Clock, BufferGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, WebGLRenderer, RingGeometry, DoubleSide, Vector3 } from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import Visitor from './Visitor.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';

// loader globals
const ktx2Loader = new KTX2Loader().setTranscoderPath('./libs/basis/');
const clock = new Clock();
const cameraDir = new Vector3();

export async function buildGallery(config) {
  // 1. Pull everything from the user‑fetched JSON
  const {
    modelPath,
    interactivesPath,
    backgroundTexture,
    sidebar,
    images,
    params
  } = config;

  console.log('config', params);

  // 2. Turn raw CIDs into full URLs
  //const modelUrl = resolveIpfs(modelPath);
  const modelUrl = modelPath
  const backgroundUrl = backgroundTexture
  //const backgroundUrl = backgroundTexture
  // ? resolveIpfs(backgroundTexture)
  //  : null;

  console.log('modelUrl', modelUrl);
  console.log('backgroundUrl', backgroundUrl);

  // 3. Three.js + BVH setup
  Mesh.prototype.raycast = acceleratedRaycast;
  BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

  // 4. Main scene + renderer
  const renderer = initRenderer();
  const scene = initScene(backgroundUrl, renderer);
  scene.name = 'mainScene';
  scene.add(new AmbientLight(0xffffff, 2));

  // 5. Camera, controls, resize
  const camera = initCamera();
  setupResizeHandler(renderer, camera);
  const controls = initControls(camera, renderer.domElement);

  // 6. 2D labels overlay
  const css2DMain = new CSS2DRenderer();
  css2DMain.setSize(window.innerWidth, window.innerHeight);
  css2DMain.domElement.style.cssText = 'position:absolute;top:0;pointer-events:none';
  document.body.appendChild(css2DMain.domElement);

  // 7. Mini‑map scene + renderer
  const rendererMap = new WebGLRenderer();
  rendererMap.setClearColor(0x142236);
  rendererMap.setSize(500, 500);
  const sceneMap = initScene(null, rendererMap);
  sceneMap.name = 'sceneMap';
  sceneMap.add(new AmbientLight(0xffffff, 2));

  const cameraMap = new OrthographicCamera(-40, 40, 40, -40, 0.1, 1000);
  cameraMap.position.set(10, 50, 10);
  cameraMap.up.set(0, 0, -1);
  cameraMap.lookAt(0, 0, 0);

  const css2DMap = new CSS2DRenderer();
  css2DMap.setSize(500, 500);
  css2DMap.domElement.style.cssText = 'position:absolute;top:0;pointer-events:none';


  // 8. Gather dependencies
  const deps = {
    ktx2Loader,
    camera,
    controls,
    scene,
    sceneMap,
    cameraMap,
    renderer,
    rendererMap,
    css2DRenderer: css2DMap,
    params
  };

  // 9. Visitor + interaction
  const visitor = new Visitor(deps);
  deps.visitor = visitor;
  scene.add(visitor);

  const popupCallback = setupModal(images);
  new PointerHandler({ camera, scene, visitor, popupCallback, deps });


  // 10. Load model & videos
  const modelLoader = new ModelLoader(deps, scene);
  await modelLoader.loadModel(modelUrl, interactivesPath);
  createVideoMeshes(scene);
  scene.updateMatrixWorld(true);
  visitor.reset();

  console.log('App built!');

  // 11. Sidebar (if provided)
  if (sidebar) {
    buildSidebar(sidebar);
    setupSidebarButtons(deps);
  }
  addSidebarListeners();

  // 12. Visitor circle on mini‑map
  const circle = new Mesh(
    new RingGeometry(0.1, 1, 32),
    new MeshBasicMaterial({ color: 0xa2c7ff, side: DoubleSide, transparent: true, opacity: 0.8, depthWrite: false })
  );
  circle.name = 'circleMap';
  circle.rotation.x = Math.PI / 2;
  circle.material.depthTest = false;
  deps.sceneMap.add(circle);
  deps.visitorMapCircle = circle;

  // 13. Animation loops
  function animate() {

    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (deps.visitor && deps.collider) deps.visitor.update(dt, deps.collider);
    if (deps.visitorMapCircle) {
      const pos = deps.visitor.position.clone();
      pos.y += 4;
      deps.visitorMapCircle.position.copy(pos);
    }
    controls.update();
    css2DMain.render(scene, camera);
    renderer.render(scene, camera);
  }

  function animateMap() {
    requestAnimationFrame(animateMap);
    camera.getWorldDirection(cameraDir);
    sceneMap.rotation.y = -Math.atan2(cameraDir.x, cameraDir.z) + Math.PI;
    sceneMap.updateMatrixWorld();
    rendererMap.render(sceneMap, cameraMap);
    css2DMap.render(sceneMap, cameraMap);
  }

  animate();
  animateMap();
  hideOverlay();


  preloadImages(images, ipfsToHttp);

}

function preloadImages(imagesMap, ipfsToHttp) {
  Object.values(imagesMap).forEach(meta => {
    const url = ipfsToHttp(meta.imagePath);
    const img = new Image();
    img.src = url;
    img.onload = () => console.log('Preloaded', url);
    img.onerror = () => console.warn('Failed to preload', url);
  });
}



function hideOverlay() {
  const overlay = document.getElementById('overlay');
  const sidebar = document.querySelector('.sidebar');
  const btn = document.getElementById('btn');

  if (!overlay) return;

  overlay.style.transition = 'opacity 1s ease';
  overlay.style.opacity = '0';

  setTimeout(() => {
    overlay.style.display = 'none';
    if (sidebar && !sidebar.classList.contains('open')) {
      sidebar.style.display = 'flex';
      sidebar.classList.add('open');
    }
    if (btn && !btn.classList.contains('open')) {
      btn.style.display = 'block';
      btn.classList.add('open');
    }
  }, 1000);
}

// util to convert ipfs://… into an HTTP gateway URL
function ipfsToHttp(ipfsUri, gateway = 'https://ipfs.io/ipfs') {
  if (ipfsUri.startsWith('ipfs://')) {
    const cid = ipfsUri.slice(7);            // drop 'ipfs://'
    return `${gateway}/${cid}`;              // e.g. https://ipfs.io/ipfs/<cid>
  }
  return ipfsUri;                            // already HTTP
}

function setupModal(imagesMap) {
  // DOM references by ID
  const modalOverlay = document.getElementById('modalOverlay');
  const modalLoader = document.getElementById('modalLoader');
  const modalImg = document.getElementById('modalImage');
  const modalDesc = modalOverlay.querySelector('.modal-description');
  const closeBtn = document.getElementById('closeModal');
  const sidebar = document.querySelector('.sidebar');
  const btn = document.getElementById('btn');
  const modal = modalOverlay.querySelector('.modal');

  // hide loader & image initially
  modalLoader.classList.add('hidden');
  modalImg.classList.add('hidden');

  // outside click & close button logic...
  modalOverlay.addEventListener('pointerdown', (e) => {
    if (!modal.contains(e.target)) hideModal();
  });
  closeBtn.addEventListener('click', hideModal);

  function hideModal() {
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('show');
    modalImg.src = '';
    modalDesc.textContent = '';
    modalLoader.classList.add('hidden');
    modalImg.classList.add('hidden');
  }

  makeModalDraggable(modal);

  // The callback to show the modal
  return function showModal(userData) {
    if (!userData?.name) return;

    // close sidebar if open
    if (sidebar?.classList.contains('open')) {
      sidebar.classList.remove('open');
      btn?.classList.remove('open');
    }

    const meta = imagesMap[userData.name];
    if (!meta) return;

    // show the overlay
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('show');

    // set description
    modalDesc.innerHTML = `
      <h3>${userData.name}</h3>
      <p>${meta.description || ''}</p>
      ${meta.author ? `<p><em>By ${meta.author}</em></p>` : ''}
    `;

    // show loader, hide image
    modalLoader.classList.remove('hidden');
    modalImg.classList.add('hidden');

    // prepare image load
    const url = ipfsToHttp(meta.imagePath);
    modalImg.onload = () => {
      modalLoader.classList.add('hidden');
      modalImg.classList.remove('hidden');
    };
    modalImg.onerror = () => {
      modalLoader.classList.add('hidden');
      modalDesc.textContent = 'Failed to load image. Please, try again later.';
    };

    // kick off the load
    modalImg.src = url;
  };
}



function makeModalDraggable(modal) {
  const dragHandle = modal.querySelector('.modal-image-container') || modal;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const startDrag = (e) => {
    if (e.target.closest('.modal-description')) return;
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
  sidebar.classList.toggle('open');
  document.querySelector("#btn").classList.toggle("open");

  setTimeout(() => {
    const helpBtn = document.querySelector('#help-icon');
    const helpDiv = document.getElementById('how_to_move');
    if (helpBtn && helpDiv) {
      helpDiv.classList.add('open');
      helpBtn.classList.add('active');
    }
  }, 500);
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

      document.querySelectorAll(".info_sidebar").forEach(div => {
        div.classList.remove("open");
      });

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
