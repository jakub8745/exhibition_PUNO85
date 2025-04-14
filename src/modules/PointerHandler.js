// src/modules/PointerHandler.js

import { Raycaster, Vector2, Vector3 } from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { MeshBVH } from 'three-mesh-bvh';



export class PointerHandler {
    constructor({ camera, scene, visitor, popupCallback, deps }) {
        this.camera = camera;
        this.scene = scene;
        this.visitor = visitor;
        this.deps = deps;
        this.params = deps.params;
        this.popupCallback = popupCallback;

        this.raycaster = new Raycaster();
        this.pointer = new Vector2();
        this.clickedPoint = new Vector3();

        this.pressTimeout = null;
        this.isPressing = false;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.MOVE_THRESHOLD = 5;

        this._addListeners();
    }

    _addListeners() {
        window.addEventListener('pointerdown', this._onPointerDown.bind(this));
        window.addEventListener('pointermove', this._onPointerMove.bind(this));
        window.addEventListener('pointerup', this._onPointerUp.bind(this));
    }

    _onPointerDown(event) {
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.isDragging = false;
        this.isPressing = true;

        this.pressTimeout = setTimeout(() => {
            if (!this.isPressing || this.isDragging) return;
            this._handleClick(event);
        }, 300);
    }

    _onPointerMove(event) {
        if (
            Math.abs(event.clientX - this.startX) > this.MOVE_THRESHOLD ||
            Math.abs(event.clientY - this.startY) > this.MOVE_THRESHOLD
        ) {
            this.isDragging = true;
            clearTimeout(this.pressTimeout);
        }
    }

    _onPointerUp() {
        this.isPressing = false;
        clearTimeout(this.pressTimeout);
    }

    _handleClick(event) {
        const validTypes = ['Image', 'Wall', 'visitorLocation', 'Room', 'Floor', 'Video'];

        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        this.raycaster.firstHitOnly = true;

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        console.log('Intersects:', intersects);

        const clickedObject = intersects.find(
            (intersect) =>
                intersect.object.userData &&
                validTypes.includes(intersect.object.userData.type)
        );

        console.log('Clicked object:', clickedObject);

        if (clickedObject && clickedObject.object.userData) {
            const userData = clickedObject.object.userData;
            const { type, elementID } = userData;

            const videoElement = elementID ? document.getElementById(elementID) : null;

            switch (type) {
                case 'Video':
                    if (!videoElement) {
                        console.warn(`No video element found with ID: ${elementID}`);
                        return;
                    }

                    videoElement.muted = false; // Unmute for manual playback

                    if (videoElement.paused) {
                        videoElement.play().catch(err => {
                            console.warn("Couldn't autoplay the video:", err);
                        });
                    } else {
                        videoElement.pause();
                    }

                    break;

                case 'Image':
                    if (this.popupCallback) {
                        this.popupCallback(userData);
                    }
                    break;

                case 'Floor':
                case 'visitorLocation':
                case 'Room':

                console.log('Clicked object:', clickedObject.object.userData);


                    const point = clickedObject.point.clone();
                    const raycaster = new Raycaster(this.visitor.position, point.clone().sub(this.visitor.position).normalize());
                    raycaster.far = this.visitor.position.distanceTo(point);
                    
                    const walls = this.scene.children.filter(obj => obj.userData.type === 'Wall');
                    const hits = raycaster.intersectObjects(walls, true);
                    
                    if (hits.length > 0) {
                      console.warn("Blocked: wall in the way.");
                      return;
                    }
                    

                    this._moveVisitor(clickedObject);
                    break;

                default:
                    console.log(`Unhandled object type: ${type}`);
            }
        }

    }

    _moveVisitor(clickedObject) {
        const clickedPoint = clickedObject.point.clone();
        //clickedPoint.y += 0.1;

        //const distance = clickedPoint.distanceTo(this.visitor.position);

        this.visitor.target = clickedObject.point.clone();
        this.visitor.isAutoMoving = true;
        
    }
}
