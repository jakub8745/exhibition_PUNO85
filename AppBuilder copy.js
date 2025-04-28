// src/modules/AppBuilder.js

import initRenderer from './packages/art-modules/src/modules/initRenderer.js';
import initScene from './packages/art-modules/src/modules/initScene.js';
import initCamera from './packages/art-modules/src/modules/initCamera.js';
import initControls from './packages/art-modules/src/modules/initControls.js';
import ModelLoader from './packages/art-modules/src/modules/ModelLoader.js';
import { setupResizeHandler } from './packages/art-modules/src/modules/resizeHandler.js';
import { createVideoMeshes } from './packages/art-modules/src/modules/createVideoMeshes.js';
import { PointerHandler } from './packages/art-modules/src/modules/PointerHandler.js';
import { AmbientLight, Raycaster, Vector2, Clock, BufferGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, WebGLRenderer, RingGeometry, DoubleSide, Vector3 } from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import Visitor from './packages/art-modules/src/modules/Visitor.js';
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


  const modelUrl = modelPath
  const backgroundUrl = backgroundTexture


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

  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let pressTimeout = null;
  let isPressing = false;
  let isDragging = false;
  let startX = 0, startY = 0;
  const MOVE_THRESHOLD = 5;

  // 9. Visitor + interaction
  const visitor = new Visitor(deps);
  deps.visitor = visitor;
  scene.add(visitor);

  //const popupCallback = setupModal(images);
  //new PointerHandler({ camera, scene, visitor, popupCallback, deps });


  // 10. Load model & videos
  const modelLoader = new ModelLoader(deps, scene);
  await modelLoader.loadModel(modelUrl, interactivesPath);
  createVideoMeshes(scene);
  scene.updateMatrixWorld(true);
  visitor.reset();

  // 11. Sidebar (if provided)
  if (sidebar) {
    buildSidebar(sidebar);
    setupSidebarButtons(deps);
  }
  addSidebarListeners();

  // Attach to the canvas or window – using renderer.domElement is usually better:
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);


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

  const onPointerDown = (event) => {
    event.preventDefault();
    startX = event.clientX; startY = event.clientY;
    isDragging = false;
    isPressing = true;
    pressTimeout = setTimeout(() => {
      if (!isPressing || isDragging) return;
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      raycaster.firstHitOnly = true;
      const intersects = raycaster.intersectObjects(scene.children);
      // … your validTypes/filter/switch code here …
    }, 300);
  };

  const onPointerMove = (event) => {
    if (Math.abs(event.clientX - startX) > MOVE_THRESHOLD ||
      Math.abs(event.clientY - startY) > MOVE_THRESHOLD) {
      isDragging = true;
      clearTimeout(pressTimeout);
    }
  };

  const onPointerUp = () => {
    isPressing = false;
    clearTimeout(pressTimeout);
  };


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

function ipfsToHttp(ipfsUri, gateways = ['https://ipfs.io/ipfs', 'https://cloudflare-ipfs.com/ipfs']) {
  if (ipfsUri.startsWith('ipfs://')) {
    const cid = ipfsUri.slice(7);  // drop 'ipfs://'

    for (let gateway of gateways) {
      const url = `${gateway}/${cid}`;
      // Try fetching the URL (could be checking by making a head request or preloading the image)
      const img = new Image();
      img.src = url;
      img.onerror = () => {
        console.warn(`Failed to load from ${gateway}. Trying next gateway...`);
      };
      img.onload = () => {
        console.log(`Successfully loaded from ${gateway}`);
      };

      // Return the URL immediately (this won't block the function, but images will load independently)
      return url;
    }
  }
  return ipfsUri;  // already HTTP
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

  //makeModalDraggable(modal);

  // The callback to show the modal
  return function showModal(userData) {
    console.log('Modal count:', document.querySelectorAll('.modal').length);


    if (!userData?.name) return;

    // close sidebar if open
    if (sidebar?.classList.contains('open')) {
      sidebar.classList.remove('open');
      btn?.classList.remove('open');
    }

    console.log('showing modal for', modal, userData);
    const meta = imagesMap[userData.name];
    if (!meta) return;
    // Hide temporarily to calculate size
    modal.style.visibility = 'hidden';
    modal.style.display = 'block'; // force layout

    // Reset styles
    // Fully reset modal position and layout
    modal.style.left = '50%';
    modal.style.top = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.position = 'fixed';

    modal.style.margin = '0';
    modal.style.bottom = '';
    modal.style.right = '';
    modal.style.maxWidth = '90vw';
    modal.style.maxHeight = '90vh';



    // Allow rendering to catch up, then show
    requestAnimationFrame(() => {
      modal.style.display = '';
      modal.style.visibility = 'visible';
    });


    // show the overlay
    setTimeout(() => {
      modalOverlay.classList.remove('hidden');
      modalOverlay.classList.add('show');
    }, 0);


    // set description
    modalDesc.innerHTML = `
      <h3>${meta.title}</h3>
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

      // Force modal to re-center after image load
      modal.style.left = '50%';
      modal.style.top = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
    };

    modalImg.onerror = () => {
      modalLoader.classList.add('hidden');
      modalDesc.textContent = 'Failed to load image. Please, try again later.';
    };

    // kick off the load
    modalImg.src = url;
    console.log('modal position', modal.getBoundingClientRect());

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
const halfH = iconSize * Math.sqrt(3) / 2;
const playShape = new Shape();
playShape.moveTo(-iconSize / 2, -halfH);
playShape.lineTo(iconSize / 2, 0);
playShape.lineTo(-iconSize / 2, halfH);
playShape.closePath();

const iconGeometry = new ShapeGeometry(playShape);

const iconMaterial = new MeshBasicMaterial({
    color: 0x3B4E9B,
    transparent: true,
    opacity: 0.7,
    wireframe: true,
    side: DoubleSide
});

const playIconMesh = new Mesh(iconGeometry, iconMaterial);
playIconMesh.name = `playIcon_${videoId}`;

playIconMesh.position.set(0, 0, -0.01);
playIconMesh.scale.set(0.5, 0.4, 0.5);

// --- ADD CIRCLE AROUND PLAY ICON ---
const circleRadius = iconSize * 0.6;
const ringThickness = iconSize * 0.08;

const ringGeo = new RingGeometry(
    circleRadius - ringThickness / 2,
    circleRadius + ringThickness / 2,
    64
);

const ringMat = new MeshBasicMaterial({
    color: 0x3B4E9B,
    transparent: true,
    opacity: 0.7,
    side: DoubleSide
});

const ringMesh = new Mesh(ringGeo, ringMat);
ringMesh.name = `playIconRing_${videoId}`;
ringMesh.position.set(-0.035, 0, -0.005);
ringMesh.scale.set(2, 2.4, 1);