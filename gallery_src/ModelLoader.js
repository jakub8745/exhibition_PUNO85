import { EdgesGeometry, LineBasicMaterial, LineSegments, Group, Box3, Mesh, MeshBasicMaterial, MathUtils, LoadingManager, PositionalAudio, AudioLoader } from 'three';
import { PositionalAudioHelper } from 'three/addons/helpers/PositionalAudioHelper.js';

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MeshBVH, StaticGeometryGenerator } from "three-mesh-bvh";
//import { modifyObjects } from './modifyObjects.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';




class ModelLoader {

    constructor(deps, scene, newFloor) {///

        this.addToSceneMapRun = true;
        this.deps = deps;
        this.collider = null;
        this.scene = scene;
        this.renderer = deps.renderer;
        this.environment = new Group();
        this.toMerge = {};
        this.typeOfmesh = "";

        this.manager = new LoadingManager();

        this.gltfLoader = new GLTFLoader(this.manager);
        this.dracoLoader = new DRACOLoader(this.manager).setDecoderPath('./libs/draco/');

        this.meshoptDecoder = MeshoptDecoder;

        this.ktx2Loader = deps.ktx2Loader.setTranscoderPath('./libs/basis/');


        this.exhibits = [];


        this.newFloor = newFloor;
        this.box = new Box3();
        this.mainScene = deps.visitor.mainScene; //

        this.setupLoaders();

        this.gui = deps.gui;

        this.currentModel = 1;
        this.totalModels = 2;





    }

    async loadModel(modelPath) {

        if (this.scene.name === 'exhibitScene') this.addToSceneMapRun = false;

        try {


            // Load the main model
            const gltfScene = await this.loadGLTFModel(modelPath, this.currentModel, this.totalModels);

            //gltfScene.scale.set(0.5, 0.5, 0.5);
            // Adjust floor if necessary
            this.adjustFloor(gltfScene);

            this.currentModel++;
            const exhibitObjects = await this.loadGLTFModel('/models/puno85_objects.glb', this.currentModel, this.totalModels);
            this.processExhibitObjects(exhibitObjects);
            gltfScene.add(exhibitObjects);
            //}

            // Process scene objects
            this.processSceneObjects(gltfScene);

            // Create and add colliders
            const collider = this.createCollider();
            this.scene.add(collider);
            this.deps.collider = collider;

            // Add environment to the scene
            this.scene.add(this.environment);

            // Customize the environment and finalize setup
            this.customizeEnvironment();

            this.addToSceneMapRun = true;


            return collider;

        } catch (error) {
            console.error('Error loading model:', error);
            throw error;

        } finally {
            await Promise.allSettled([
                //console.log("models loaded ocksovncifsnvinfs"),
            ]);

        }
    }



    // Helper function to load GLTF model
    async loadGLTFModel(modelPath, currentModel, totalModels) {
        const progressText = document.getElementById('progress-text');



        const onProgress = (xhr) => {

            if (xhr.total) {

                const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);

                console.log(`Loading model ${currentModel}/${totalModels}: ${percentComplete}%`);
                progressText.textContent = `Loading model ${currentModel}/${totalModels}: ${percentComplete}%`;
            }
        };

        const { scene: gltfScene } = await this.gltfLoader.loadAsync(modelPath, onProgress);
        gltfScene.updateMatrixWorld(true);
        return gltfScene;
    }


    // Helper function to set up loaders
    setupLoaders() {
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        this.gltfLoader.setKTX2Loader(this.ktx2Loader);
        this.gltfLoader.setMeshoptDecoder(this.meshoptDecoder);
    }

    // Helper function to load GLTF model


    // Helper function to adjust floor
    adjustFloor(gltfScene) {
        gltfScene.traverse((object) => {
            if (object.isMesh && object.name === "FloorOut") {
                object.position.y -= 0.1;
            }
        });
    }

    // Helper function to process exhibit objects
    processExhibitObjects(exhibitObjects) {
        exhibitObjects.traverse((object) => {
            if (object.isMesh) {
             
                object.wireframe = true;
                object.material.transparent = true;
                object.material.opacity = 0.0;
                object.interactive = true;
                
            }
        });
    }

    // Helper function to process scene objects
    processSceneObjects(gltfScene) {
     
        gltfScene.traverse((object) => {
            if (object.isMesh || object.isLight) {
                if (object.isLight) object.visible = false;

                const meshType = object.userData.type;

              

                this.toMerge[meshType] = this.toMerge[meshType] || [];
                this.toMerge[meshType].push(object);
            }
        });

        this.mergeSceneObjects();
    }

    // Helper function to merge scene objects
    mergeSceneObjects() {
        for (const meshType in this.toMerge) {
            const objects = this.toMerge[meshType];
            objects.forEach((mesh) => {
                if (mesh.userData.name !== "VisitorEnter" && mesh.userData.name !== "ciprianiAudio" && mesh.name !== "Circle") {
                    this.environment.attach(mesh);
                } else if (mesh.userData.name === "ciprianiAudio") {
                    //

                    this.createAudio(mesh);
                    this.environment.attach(mesh);

                } else {
                    //console.log("VisitorEnter znaleziony", mesh);
                }
            });
        }
        this.environment.name = "environment";
    }

    // Helper function to create collider
    createCollider() {
        const staticGenerator = new StaticGeometryGenerator(this.environment);
        staticGenerator.attributes = ["position"];

        const mergedGeometry = staticGenerator.generate();
        mergedGeometry.boundsTree = new MeshBVH(mergedGeometry, { lazyGeneration: false });

        const collider = new Mesh(mergedGeometry);
        collider.material.wireframe = true;
        collider.material.opacity = 0;
        collider.material.transparent = true;
        collider.name = "collider";
        collider.visible = false;

        return collider;
    }

    // Helper function to customize environment
    customizeEnvironment() {

        this.environment.traverse((object) => {
            if (this.scene.name === "mainScene" &&
                (/Wall|visitorLocation|Room/.test(object.userData.name) ||
                    /visitorLocation|Room/.test(object.userData.type))) {

                this.addToSceneMap(object);
            }
        });

    }

    addVisitorMapCircle() {

        // visitor Map
        circleMap = new Mesh(
            new RingGeometry(0.1, 1, 32),
            new MeshBasicMaterial({
                color: 0xa2c7ff,
                side: DoubleSide,
                transparent: true,
                opacity: 1,
                //depthTest: false // Ensures it renders on top of everything

            })
        );
        circleMap.position.copy(visitor.position);
        circleMap.position.y = visitor.position.y + 10;
        circleMap.name = "circleMap";
        circleMap.rotation.x = (90 * Math.PI) / 180;
        circleMap.visible = true
        circleMap.material.depthWrite = true

        sceneMap.add(circleMap);

        //

    }


    addToSceneMap(mesh) {
    
        

        if (this.addToSceneMapRun) {

            const { sceneMap } = this.deps;

            const cClone = mesh.clone();



            // Assign material for the base mesh
            cClone.material = new MeshBasicMaterial({
                color: cClone.userData.type === 'visitorLocation' ||
                    cClone.userData.type === 'element' ||
                    cClone.userData.type === 'Room'
                    ? 0x1b689f
                    : 0xffffff,
                opacity: cClone.userData.type === 'visitorLocation' ||
                    cClone.userData.type === 'element' ||
                    cClone.userData.type === 'Room'
                    ? 0.8
                    : 1,
                transparent: true,
                depthWrite: false
            });

            // Add an outline using EdgesGeometry
            const edgesGeometry = new EdgesGeometry(cClone.geometry);
            const edgeMaterial = new LineBasicMaterial({ color: 0x00000f }); // Black outline
            const edgeLines = new LineSegments(edgesGeometry, edgeMaterial);

            // Ensure the outline follows the clone’s transform
            edgeLines.position.copy(cClone.position);
            edgeLines.rotation.copy(cClone.rotation);
            edgeLines.scale.copy(cClone.scale);

            // Add both the mesh and outline to the scene
            sceneMap.add(cClone);
            sceneMap.add(edgeLines);



            if (mesh.userData.label) {
                const labelDiv = document.createElement('div');
                labelDiv.className = 'label';
                labelDiv.textContent = mesh.userData.label;
                labelDiv.style.marginTop = '1em';
                labelDiv.style.pointerEvents = 'auto';

                // Add click event to label to move the visitor
                labelDiv.addEventListener('click', () => {

                    const targetPosition = mesh.position.clone();

                    this.deps.visitorEnter.copy(targetPosition);

                    this.deps.resetVisitor();
                });

                const labelObject = new CSS2DObject(labelDiv);
                labelObject.position.set(10, 0, -5);
                cClone.add(labelObject);
            }

            sceneMap.add(cClone);

        }
    }

    createAudio(mesh) {
        // Scale the mesh for the audio icon or object
        mesh.scale.setScalar(0.1);

        // Create positional audio
        const sound = new PositionalAudio(this.deps.listener);
        const audioLoader = new AudioLoader();

        // Load the audio file
        audioLoader.load(mesh.userData.audio, (buffer) => {
            sound.name = 'trembitaAudio'; // Assign name to the audio
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setRefDistance(mesh.userData.audioRefDistance);
            sound.setRolloffFactor(mesh.userData.audioRolloffFactor);
            sound.setVolume(mesh.userData.audioVolume);
            sound.setDirectionalCone(10, 23, 0.1);

            // Add positional audio helper (for visualization during development)
            const helper = new PositionalAudioHelper(sound, 20);
            //sound.add(helper);

            // Attach sound to the mesh
            mesh.add(sound);

            // Add the audio object to the shared array
            this.deps.audioObjects.push(sound);

            mesh.rotateX(Math.PI / 2);
            const radians = MathUtils.degToRad(120);
            mesh.rotation.y += radians;

        });
    }

}

export default ModelLoader;
