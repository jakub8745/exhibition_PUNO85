
//

console.log('TODO: main scene COLLIDER nie działa');

import { WebGLRenderer, Scene, PerspectiveCamera, WebGLRenderTarget, OrthographicCamera, Raycaster, Clock, Object3D, Mesh, Group, TextureLoader, AudioListener } from 'three'
import { Fog, AmbientLight, BufferGeometry, RingGeometry, MeshStandardMaterial, MeshBasicMaterial, Vector2, Vector3, DoubleSide, EquirectangularReflectionMapping, ACESFilmicToneMapping, AgXToneMapping, PCFSoftShadowMap, BasicShadowMap, LinearToneMapping, SRGBColorSpace } from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

//import RenderTransitionPass from './src/RenderTransitionPass.js';///three/addons/postprocessing/RenderTransitionPass.js
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


import { DotScreenShader } from 'three/addons/shaders/DotScreenShader.js'

import ModelLoader from './src/ModelLoader.js'


import Visitor from './src/Visitor.js'////

import JoyStick from './src/Joystick.js';

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import {
  acceleratedRaycast,
  disposeBoundsTree,
  computeBoundsTree,
} from 'three-mesh-bvh';

//import { acceleratedRaycast, disposeBoundsTree, computeBoundsTree } from 'https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.8.3/build/index.module.js';


import TWEEN from 'three/addons/libs/tween.module.js';

const loader = new TextureLoader();

const params = {
  exhibitCollider: null,
  firstPerson: true,
  displayCollider: false, //true,
  visualizeDepth: 10,
  gravity: -30,
  visitorSpeed: 3,
  physicsSteps: 5,
  exposure: 1,
  gizmoVisible: false,
  canSeeGizmo: false,
  transControlsMode: "rotate",
  heightOffset: new Vector3(0, 0.33, 0),// offset the camera from the visitor
  archiveModelPath: "/models/nowy_exterior.glb",
  enablePostProcessing: true,
  isLowEndDevice: false,//navigator.hardwareConcurrency <= 4,
  transitionAnimate: true,
  transition: 0,

};

if (params.isLowEndDevice) alert('You are using a device with low capabilities. Some features will be unavailable, the aesthetic experience of the 3D world will be limited. Despite this, we strongly encourage you to explore the Blue Point Art Archive, because the most IMPORTANT thing is the ARTWORK, and you will find a lot of it here.');

let ileE = 2,
  ileMesh = 0,
  ileRazy = 0;

//
const listener = new AudioListener();

const sceneRegistry = {
  //mainScene: new Scene(),
  //exhibitScene: new Scene(),
  sceneMap: new Scene(),
};

const textureFolder = "/textures/";
const textureCache = new Map();

let renderer, camera, scene, clock, tween, stats, anisotropy;
let composer, transitioning, mainComposer, exhibitComposer, transitionComposer, renderPass, outputPass, dotScreenPass, dotScreenPassMain, renderTransitionPass, renderPassMain, renderPassExhibit, transitionTween;
let rendererMap, cameraMap, circleMap, sceneMap, css2DRenderer, exhibitScene;
const cameraDirection = new Vector3();

const ktx2Loader = new KTX2Loader()

let collider, visitor, controls, control;
let circle, circleYellow, circleBlue
let environment = new Group();

let MapAnimationId = null; // defined in outer scope
let animationId = null;

const raycaster = new Raycaster();
let intersectedFloor0 = new Object3D();
intersectedFloor0.name = "FloorOut";
let bgTexture0
const lightsToTurn = [];
const audioObjects = [];
const visitorEnter = new Vector3();

const pointer = new Vector2();
const clickedPoint = new Vector3();
const visitorPos = new Vector3();
let Wall,
  result,
  intersects,
  video, image

let audioHandler, exhibitModelPath//, exhibitModelPath0;

let deps = {};

Mesh.prototype.raycast = acceleratedRaycast;
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

let target = null;
let timeout = null;

const gui = new GUI();
gui.show(false);


// Joystick 
const joystick = new JoyStick({
  canvas: document.getElementById("joystickCanvas")
});

joystick.onDirectionChange((data) => {
  const { direction } = data;

  switch (direction) {
    case 'up':
      visitor.fwdPressed = true;
      visitor.bkdPressed = false;
      break;
    case 'down':
      visitor.bkdPressed = true;
      visitor.fwdPressed = false;
      break;
    case 'left':
      visitor.lftPressed = true;
      visitor.rgtPressed = false;
      break;
    case 'right':
      visitor.rgtPressed = true;
      visitor.lftPressed = false;
      break;
    default:  // Stop moving when joystick is centered
      visitor.fwdPressed = false;
      visitor.bkdPressed = false;
      visitor.lftPressed = false;
      visitor.rgtPressed = false;
      break;
  }
});


console.log("isLowEndDevice: ", params.isLowEndDevice);

//
const waitForMe = async (millisec) => {
  await new Promise(resolve => requestAnimationFrame(time => resolve(time + millisec)));
};

//
const fadeOutEl = (el) => {
  el.style.animation = "fadeOut 2s forwards";
  el.addEventListener("animationend", () => {
    el.remove();
  });
};

init();


// init

function init() {

  // przeniesione z loadera100%
  let sidebar = document.querySelector(".sidebar");
  sidebar.style.display = "block";
  sidebar.style.animation = "fadeIn 2s forwards";
  //
  fadeOutEl(document.getElementById("overlay"));

  // renderer setup
  renderer = new WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });


  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !params.isLowEndDevice;
  renderer.shadowMap.type = params.isLowEndDevice ? BasicShadowMap : PCFSoftShadowMap
  renderer.outputColorSpace = SRGBColorSpace;

  const isAppleDevice = false///Mac|iPad|iPhone|iPod/.test(navigator.userAgent);


  renderer.toneMapping = params.isLowEndDevice ? LinearToneMapping : (isAppleDevice ? AgXToneMapping : ACESFilmicToneMapping);
  renderer.toneMappingExposure = params.exposure;

  document.body.appendChild(renderer.domElement);

  anisotropy = renderer.capabilities.getMaxAnisotropy();

  ktx2Loader.setTranscoderPath('./libs/basis/').detectSupport(renderer);




  // scene setup
  scene = new Scene();


  // camera setup
  camera = new PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    70
  );
  camera.position.set(10, 6, -10);
  camera.updateProjectionMatrix();
  window.camera = camera;

  //audio on camera
  camera.add(listener);

  clock = new Clock();

  // orbit c
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 5, 0);

  controls.maxPolarAngle = Math.PI;
  controls.minDistance = 1e-4;
  controls.maxDistance = 1e-4;

  // transform c
  control = new TransformControls(camera, renderer.domElement);
  control.addEventListener("dragging-changed", function (event) {
    controls.enabled = !event.value;
  });

  //
  // CSS3DRenderer for DOM elements
  const innerWidth = 780,
    innerHeight = 800;


  // sceneMap
  sceneMap = sceneRegistry["sceneMap"];
  sceneMap.scale.setScalar(25);
  sceneMap.rotation.x = Math.PI;
  sceneMap.rotation.y = Math.PI / 180;
  sceneMap.position.set(0, 0, 0);
  sceneMap.updateMatrixWorld(true);


  // camera
  cameraMap = new OrthographicCamera(
    innerWidth / -2,
    innerWidth / 2,
    innerHeight / 2,
    innerHeight / -2,
    0.1,
    10000
  );
  cameraMap.position.set(0, -50, 0);
  cameraMap.lookAt(new Vector3(0, 0, 0));


  //rendererMap = new WebGLRenderer();
  rendererMap = new WebGLRenderer();
  rendererMap.setClearColor(0x142236);
  document
    .querySelector("div#map_in_sidebar.info_sidebar")
    .appendChild(rendererMap.domElement);
  rendererMap.setSize(500, 500);


  // CSS2DRenderer for DOM elements
  css2DRenderer = new CSS2DRenderer();
  css2DRenderer.setSize(500, 500);
  css2DRenderer.domElement.style.position = 'absolute';
  css2DRenderer.domElement.style.top = '0';
  css2DRenderer.domElement.style.pointerEvents = 'none'; // Make sure it doesn't block interactions
  document.querySelector("div#map_in_sidebar.info_sidebar").appendChild(css2DRenderer.domElement);


  // AmbientLight MAP
  const light = new AmbientLight(0xffffff, 20); // soft white light
  sceneMap.add(light);




  // stats setup
  stats = new Stats();
  document.body.appendChild(stats.dom);




  const resetVisitor = () => {

    visitor.visitorVelocity.set(0, 0, 0)

    const targetV = visitor.target.clone()

    const circleMap = sceneMap.getObjectByName("circleMap");
    if (circleMap) {
      const targetVmap = visitor.target.clone()
      targetVmap.y + 100
      circleMap.position.copy(targetVmap);
    }

    targetV.y = 10;
    camera.position.sub(controls.target);
    controls.target.copy(targetV);
    camera.position.add(targetV);
    controls.update();

    visitor.position.copy(targetV);

    animate();

  }

  //
  deps = {
    params,
    camera,
    control,
    controls,
    environment,
    renderer,
    ktx2Loader,
    gui,
    lightsToTurn,
    mainScene: scene,
    //exhibitScene: visitor.exhibitScene,
    //isVisitorOnMainScene: true,
    sceneMap,
    loader,
    listener,
    audioObjects,
    //sphereSize: params.sphereSize,
    visitor,
    visitorEnter,
    TWEEN,
    anisotropy,
    //composer,
    mainComposer,
    exhibitComposer,
    animationId,
    resetVisitor: resetVisitor,
    mainSceneY: undefined,
  };

  visitor = new Visitor(deps);
  visitor.exhibitScene.name = 'exhibitScene';

  scene.name = "mainScene";
  scene.fog = new Fog(0x2b0a07, 3.1, 18);

  const ambientLight = new AmbientLight(0xFFF9E3, 5);
  scene.add(ambientLight);

  scene.add(visitor)

  visitor.mainScene = scene; // Copy the main scene to the visitor scene;


  //
  addVisitorMapCircle();

  // composer
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const effect1 = new ShaderPass(DotScreenShader);
  effect1.uniforms['scale'].value = 10;
  composer.addPass(effect1);


  // LOAD MODEL (environment, collider)


  const modelLoader = new ModelLoader(deps, visitor.parent);

  async function loadMainScene() {

    const mainCollider = await modelLoader.loadModel(params.archiveModelPath);

    deps.params.exhibitCollider = mainCollider;
    deps.bgTexture = "textures/galaktyka.ktx2";
    deps.bgInt = 1;
    deps.bgBlur = 0;

    handleSceneBackground(deps);

    // renderTransitionPass.enabled = false;
    //dotScreenPass.enabled = true;

   // const loadingElement = document.getElementById('loading'); // Spinner container
    //const progressText = document.getElementById('progress-text'); // Progress percentage text
  

    animate();
  }

  loadMainScene();

  preloadTextures();

  const loadingElement = document.getElementById('loading'); // Spinner container

    loadingElement.style.display = 'none';
  // events
  document
    .querySelector("img#audio-on")
    .addEventListener("pointerdown", (evt) => {
      evt.preventDefault();
      const intersectedFloor = visitor.checkLocation();
      const audioHandler = new AudioHandler();
      audioHandler.handleAudio(scene.getObjectByName(intersectedFloor.userData.audioToPlay));

    });

  // optimized raycaster after click
  const onPointerDown = (event) => {
    const { clientX, clientY } = event;
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    raycaster.firstHitOnly = true;
    intersects = raycaster.intersectObjects(visitor.scene.children);

    Wall = intersects.find(({ object }) => object.userData.name === "Wall");

    result = intersects.find(({ object }) => object.userData.type === "Video");
    if (result) {
      video = document.getElementById(result.object.userData.elementID);
      video.paused ? video.play() : video.pause();
    }

    // checking if clicked obj needs description
    image = intersects.find(({ object }) => object.userData.opis);


    if (image && intersects.indexOf(image) < intersects.indexOf(Wall)) {
      if (!document.getElementById("viewer")) {
        const viewer = document.createElement("div");
        viewer.className = "viewer";
        viewer.id = "viewer";
        viewer.style.animation = "fadeInViewer 2s forwards";
        viewer.innerHTML = "</br>";
        const viewImage = document.createElement("img");
        viewImage.id = "image-view";
        viewImage.src = image.object.userData.Map;
        viewer.appendChild(viewImage);

        // text-on-screen
        if (image.object.userData.opis) {
          const textOnscreen = document.createElement("div");
          textOnscreen.id = "text-on-screen";
          viewer.appendChild(textOnscreen);
          textOnscreen.innerText = `${image.object.userData.opis}`;
        }
        document.body.appendChild(viewer);
      }
    } else {
      if (document.getElementById("viewer")) {
        const el = document.getElementById("viewer");
        fadeOutEl(el);
      }
    }

    // is floor clicked?
    result = intersects.find(
      ({ object }) => object.userData.type === "visitorLocation"
    );

    if (result) {
      const index = intersects.indexOf(result);

      // if clicked floor is on 1st plan
      if (index <= 1) {
        const { distance, point } = result;
        clickedPoint.copy(point);
        visitorPos.copy(visitor.position);
        clickedPoint.y = visitor.position.y;

        // Tween
        tween = new TWEEN.Tween(visitorPos)
          .to(clickedPoint, (distance * 1000) / params.visitorSpeed)
          .onUpdate(() => {
            visitor.position.copy(visitorPos);
            visitor.updateMatrixWorld();

            // because of event change on controls
            //renderer.render(scene, camera);
          });
        tween.start(); // Start the tween immediately

        let innerRad = new Vector3(1, 1, 1);
        const zero = new Vector3(0, 0, 0);
        circle.position.copy(point);
        circle.position.y += 0.01;
        const tweenCircle = new TWEEN.Tween(innerRad);
        tweenCircle.to(zero, 3000 / params.visitorSpeed);
        tweenCircle.onUpdate(() => {
          circle.scale.copy(innerRad);
        });
        tweenCircle.start();
      }
    }
  };


  // sidebar buttons events
  function handleSBbuttonsClick(divID) {
    //const isItMap = false;
    document.querySelectorAll(".info_sidebar").forEach((div) => {
      if (div.id === divID) {
        // Adds 'open' class if it doesn't have it, removes if it does
        div.classList.toggle("open");
      } else {
        // Makes sure other divs are hidden
        div.classList.remove("open");
      }
    });
  }

  document.addEventListener("onload", (e) => {
  });

  // open/close sb
  document.querySelector("#btn").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    document.querySelector(".sidebar").classList.toggle("open");
  });

  // info
  document.querySelector("#info-icon").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handleSBbuttonsClick(e.target.getAttribute("data-divid"));
  });

  // publications
  document.querySelector("#books-icon").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handleSBbuttonsClick(e.target.getAttribute("data-divid"));
  });

  // archive's map
  document.querySelector("#map-icon").addEventListener("pointerdown", (e) => {
    e.preventDefault();

    handleSBbuttonsClick(e.target.getAttribute("data-divid"));
    if (
      document
        .querySelector("li.text_in_sidebar div#map_in_sidebar.info_sidebar")
        .classList.contains("open")
    ) {
      animateMap();
    } else {
      if (MapAnimationId) {
        cancelAnimationFrame(MapAnimationId);
        MapAnimationId = null; // reset the id
      }
    }
  });
  // open BPA Gallery website
  document.querySelector("#bpa-icon").addEventListener("pointerdown", (e) => {
    e.preventDefault();
    let newWindow = window.open();
    newWindow.location.assign("https://bluepointart.uk/");
  });

  //

  //////
  // checking how many click
  const textOnScreenEl = document.getElementById("text-on-screen");
  const viewerEl = document.getElementById("viewer");
  window.addEventListener("pointerdown", (e) => {
    if (e.target === target) {
      // double
      clearTimeout(timeout);
      target = null;
      timeout = null;
      onPointerDown(e);
    } else {
      // single
      target = e.target;
      timeout = setTimeout(() => {
        target = null;
        timeout = null;
      }, 500);
      if (textOnScreenEl) {
        const el = textOnScreenEl;
        fadeOutEl(el);
      } else if (viewerEl) {
        let el = viewerEl;
        fadeOutEl(el);
      }
    }
  });

  window.addEventListener(
    "resize",
    function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    },
    false
  );


  // Key controls
  const keysPressed = {};

  const keyDownHandler = (event) => {
    keysPressed[event.key] = true;

    switch (event.key) {
      case "ArrowDown":
      case "s":
        visitor.bkdPressed = true;
        break;
      case "ArrowUp":
      case "w":
        visitor.fwdPressed = true;
        break;
      case "ArrowRight":
      case "d":
        visitor.rgtPressed = true;
        break;
      case "ArrowLeft":
      case "a":
        visitor.lftPressed = true;
        break;
      case " ":
        if (visitor.visitorIsOnGround) {
          deps.visitor.visitorVelocity.y = 20.0;
          visitor.visitorIsOnGround = false;
        }
        break;
      case "g":
        if (params.canSeeGizmo) {
          control._gizmo.visible = !control._gizmo.visible;
        }
        break;
      case "m":
        control.setMode("translate");
        break;
      case "r":
        control.setMode("rotate");
        break;
      case "t":

        break;
      case "Escape":
        control.reset();
        break;
    }
  };

  const keyUpHandler = (event) => {
    delete keysPressed[event.key];

    switch (event.key) {
      case "ArrowDown":
      case "s":
        visitor.bkdPressed = false;
        break;
      case "ArrowUp":
      case "w":
        visitor.fwdPressed = false;
        break;
      case "ArrowRight":
      case "d":
        visitor.rgtPressed = false;
        break;
      case "ArrowLeft":
      case "a":
        visitor.lftPressed = false;
        break;
    }
  };

  window.addEventListener("keydown", keyDownHandler);
  window.addEventListener("keyup", keyUpHandler);

}
//
// update visitor


async function updateVisitor(collider, delta) {

  const result = visitor.update(delta, collider);

  if (result.changed) {



    const newFloor = result.newFloor;
    let exhibitModelPath = newFloor.userData.exhibitModelPath;

    console.log("newFloor: ", newFloor, visitor.parent);

    if (newFloor.name === "FloorOut") {

      disposeSceneObjects(visitor.exhibitScene);


      visitor.moveToScene(visitor.mainScene, () => {

      });

    } else {


      const modelLoader = new ModelLoader(deps, visitor.exhibitScene, newFloor);

      visitor.exhibitScene.add(new AmbientLight(0x404040, 45));

      async function loadScene() {

        const mainCollider = await modelLoader.loadModel(exhibitModelPath);


        deps.params.exhibitCollider = mainCollider;
        deps.bgTexture = `/textures/${newFloor.userData.bgTexture || "public/textures/bg_color.ktx2"}`;
        deps.bgInt = newFloor.userData.bgInt || 1;
        deps.bgBlur = newFloor.userData.bgBlur || 0;


        animate();
      }

      await loadScene();
      //
      visitor.moveToScene(visitor.exhibitScene)
      //handleSceneBackground(deps);

      //visitor.currentScene = reverse ? visitor.mainScene : visitor.exhibitScene;
      //
      //startTransitionTween(visitor.exhibitScene, true);

    }

    function startTransitionTween(scene, reverse) {
      const startValue = reverse ? 0 : 1;
      const endValue = reverse ? 1 : 0;

      params.transition = startValue;

      new TWEEN.Tween(params)
        .to({ transition: endValue }, 3000) // 1-second transition
        .onUpdate(() => {
          renderTransitionPass.setTextureThreshold(params.transition);
        })
        .onComplete(() => {
          transitioning = false; // End the transition

          visitor.moveToScene(scene);
          handleSceneBackground(deps);

          visitor.currentScene = reverse ? visitor.mainScene : visitor.exhibitScene;
        })
        .start();

      transitioning = true; // Begin the transition
    }


    cancelAnimationFrame(deps.animationId);

    visitor.lastFloorName = newFloor.name;

    const { bgTexture = "textures/bg_color.ktx2" } = newFloor.userData;
    deps.bgTexture = bgTexture;
  }


}
//
function handleAudio(intersectedFloor, audioHandler) {
  if (intersectedFloor.userData.audioToPlay) {
    audioHandler.handleAudio(null);

    const audioOn = document.querySelector("#audio-on");
    audioOn.style.display = "block";
    audioOn.classList.add("flash");

    const animationEndListener = () => {
      audioOn.classList.remove("flash");
      audioOn.removeEventListener("animationend", animationEndListener);
    };

    audioOn.addEventListener("animationend", animationEndListener);

    for (const el of audioObjects) {
      if (el.children[0].name === intersectedFloor.userData.audioToPlay) {
        audioHandler.handleAudio(el.children[0]);
      }
    }
  } else {
    audioHandler.handleAudio(null);
  }
}

function handleLights(lightsToTurn, lightsToTurnValue) {
  for (const el of lightsToTurn) {
    el.visible = el.userData.name === lightsToTurnValue;

  }
}

function handleVideos(scene, belongsTo) {
  scene.traverse(c => {
    if (c.userData.type === "Video") {
      const belongsToArray = Array.isArray(belongsTo) ? belongsTo : [belongsTo];
      const cBelongsToArray = Array.isArray(c.userData.belongsTo) ? c.userData.belongsTo : [c.userData.belongsTo];

      const belongsToCurrentExhibit = cBelongsToArray.some(exhibit => belongsToArray.includes(exhibit));

      if (belongsToCurrentExhibit) {
        if (c.userData.elementID) {
          const video = document.getElementById(c.userData.elementID);
          video.play();
        } else {
          const allVideos = document.getElementsByTagName("video");
          for (let i = 0; i < allVideos.length; i++) {
            allVideos[i].pause();
          }
        }
      }
    }
  });
}



function handleSceneBackground(deps) {

  const { bgTexture, bgBlur, bgInt } = deps;

  let scene = visitor.parent;
  const extension = bgTexture.split('.').pop();


  if (extension === 'ktx2') {

    console.log("ktx2", bgTexture);

    ktx2Loader.load(bgTexture, (texture) => {

      texture.mapping = EquirectangularReflectionMapping;
      texture.colorSpace = SRGBColorSpace;

      scene.background = texture;  // Set the background texture
      scene.backgroundIntensity = bgInt;
      scene.backgroundBlurriness = bgBlur;

    }, undefined, (error) => {
      console.error('Error loading KTX2 texture:', error);
    });
  } else {
    // Handle loading standard texture formats like jpg or png
    loader.load(bgTexture, (texture) => {

      texture.mapping = EquirectangularReflectionMapping;
      texture.colorSpace = SRGBColorSpace;

      scene.background = texture;  // Set the background texture
      scene.backgroundIntensity = bgInt;
      scene.backgroundBlurriness = bgBlur;

    }, undefined, (error) => {
      console.error('Error loading texture:', error);
    });
  }
}

function disposeSceneObjects(scene) {
  scene.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      object.material.dispose();
    } else if (object.isLight) {
      object.dispose();
    } else if (object.isBone) {
      object.dispose();
    } else if (object.isSkinnedMesh) {
      object.dispose();
    }
  });

  // Remove all children from the scene
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

}

//

function animateMap() {
  MapAnimationId = requestAnimationFrame(animateMap);

  camera.getWorldDirection(cameraDirection);
  const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
  sceneMap.rotation.y = -angle + Math.PI;

  sceneMap.updateMatrixWorld();

  rendererMap.render(sceneMap, cameraMap);
  css2DRenderer.render(sceneMap, cameraMap);
}

//
function animate() {
  if (!deps.params.exhibitCollider) return;

  const collider = deps.params.exhibitCollider;
  stats.update();
  TWEEN.update();  // Update all tweens globally


  const delta = Math.min(clock.getDelta(), 0.1);

  // Update visitor position and movement logic
  if (collider && collider.geometry && collider.material) {
    const physicsSteps = params.physicsSteps;
    for (let i = 0; i < physicsSteps; i++) {
      updateVisitor(collider, delta / physicsSteps);
    }
  }

  if (!visitor.parent) return;

  if (visitor.parent === visitor.mainScene) {
    composer.render();

  } else {
    renderer.render(visitor.parent, camera);

  }



  controls.update();
  deps.animationId = requestAnimationFrame(animate);
}




////


function addVisitorMapCircle() {




  // visitor Map
  circleMap = new Mesh(
    new RingGeometry(0.1, 1, 32),
    new MeshBasicMaterial({
      color: 0xbf011f,
      side: DoubleSide,
      transparent: true,
      opacity: 1,
    })
  );
  circleMap.position.copy(visitor.position);
  circleMap.position.y = visitor.position.y + 1000;
  circleMap.name = "circleMap";
  circleMap.rotation.x = (90 * Math.PI) / 180;
  circleMap.visible = true
  circleMap.material.depthWrite = true

  sceneMap.add(circleMap);

  /// circle (pointer)
  circle = new Group();
  circle.position.copy(visitor.position);
  circle.position.y = -30;

  circleYellow = new Mesh(
    new RingGeometry(0.1, 0.12, 32),
    new MeshBasicMaterial({
      color: 0xffcc00,
      side: DoubleSide,
      transparent: true,
      opacity: 0.5,
    })
  );
  circleYellow.rotation.x = (90 * Math.PI) / 180;

  circleBlue = new Mesh(
    new RingGeometry(0.12, 0.14, 32),
    new MeshBasicMaterial({
      color: 0x0066cc,
      side: DoubleSide,
      transparent: true,
      opacity: 0.5,
    })
  );
  circleBlue.rotation.x = (90 * Math.PI) / 180;
  circle.add(circleYellow);
  circle.add(circleBlue);
  scene.add(circle);

  //
  scene.add(environment);

}

//

function ileElementow() {
  ileE++;
  if (ileRazy < 1 && ileE <= ileMesh) {
    const progress = Math.round((ileE / ileMesh) * 100);
    document.getElementById("loading").textContent = progress + "% loaded";
    if (progress === 100) {
      ileRazy++;
      fadeOutEl(document.getElementById("overlay"));
    }
  }
}

//
function preloadTextures() {

  ktx2Loader.setTranscoderPath('./libs/basis/')
  ktx2Loader.detectSupport(renderer)

  const textureFiles = ['bg_color.ktx2', 'galaktyka.ktx2', 'equMap_podMostem.ktx2', 'bg_white.ktx2', 'bg_lockdowns.ktx2', 'dystopia/bgVermeerViewofDelft.ktx2']; // Add all texture filenames here


  textureFiles.forEach((textureFile) => {

    const textureUrl = textureFolder + textureFile;

    ktx2Loader.load(textureUrl, (texture) => {

      texture.mapping = EquirectangularReflectionMapping;
      texture.colorSpace = SRGBColorSpace;

      textureCache.set(textureUrl, texture);

    });
  });
}

//
class AudioHandler {
  handleAudio(audioToTurn) {
    const audioOn = document.querySelector("#audio-on");

    if (!audioToTurn || audioToTurn.type !== "Audio") {
      audioOn.src = "/icons/audioMuted.png";
      audioOn.style.display = "none";
      audioObjects.forEach(el => el.children[0].pause());
      return;
    }

    if (audioToTurn.isPlaying) {
      audioToTurn.stop();
      audioOn.style.display = "block";
      audioOn.src = "/icons/audioMuted.png";
    } else {
      audioToTurn.play();
      audioOn.style.display = "block";
      audioOn.src = "/icons/audioButton.png";
    }
  }
}

//
class VisitorLocationChecker {
  constructor(scene) {
    this.scene = scene;
    this.raycaster = new Raycaster();
    this.downVector = new Vector3(0, -1, 0);
    this.vector = new Vector3();
    this.intersectedObjects = [];
  }
  checkVisitorLocation(visitor) {
    this.raycaster.firstHitOnly = true;
    this.raycaster.set(visitor.position, this.downVector);

    return this.intersectedObjects.find(({ object }) => {
      const type = object.userData.type;
      return type === "visitorLocation" || type === "Room";
    })?.object;

  }
}
