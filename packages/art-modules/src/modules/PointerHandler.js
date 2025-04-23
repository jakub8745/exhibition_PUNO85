// src/modules/PointerHandler.js

import {
  Raycaster,
  Vector2,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  CircleGeometry,
  DoubleSide,
  Quaternion,
  Box3,
  Matrix3,
  MathUtils
} from 'three';

import * as THREE from 'three';


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

    this.renderer = deps.renderer;

    this.pressTimeout = null;
    this.isPressing = false;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.MOVE_THRESHOLD = 5;

    this.hoverIndicator = this._createHoverCircle();
    this.scene.add(this.hoverIndicator);

    this._addListeners();

    this.sidebar = document.querySelector('.sidebar');
    this.btn = document.getElementById('btn');

  }

  _createHoverCircle() {
    const geometry = new CircleGeometry(0.1, 32);
    const material = new MeshBasicMaterial({
      color: 0x459de6,
      transparent: true,
      opacity: 0.8,
      side: DoubleSide,
      depthWrite: false,
    });
    const mesh = new Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.visible = false;

    return mesh;
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
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const { point, face, object } = intersects[0];
      this.hoverIndicator.visible = true;
      const normalMatrix = new Matrix3().getNormalMatrix(object.matrixWorld);
      const normal = face.normal.clone().applyMatrix3(normalMatrix).normalize();
      this.hoverIndicator.position.copy(point).addScaledVector(normal, 0.01);


      const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
      this.hoverIndicator.quaternion.copy(quat);

    } else {
      this.hoverIndicator.visible = false;

    }

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
    const clickedObject = intersects.find(
      (intersect) =>
        intersect.object.userData &&
        validTypes.includes(intersect.object.userData.type)
    );

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
          videoElement.muted = false;
          if (videoElement.paused) {
            videoElement.play().then(() => {
              // Hide play label if it's there
              const playLabel = clickedObject.object.getObjectByName(`playLabel_${elementID}`);
              if (playLabel) {
                playLabel.visible = false;
              }
            }).catch(err => console.warn("Couldn't autoplay the video:", err));

            this._moveToVideo(clickedObject);

          } else {
            videoElement.pause();

            // Optionally show the label again on pause
            const playLabel = clickedObject.object.getObjectByName(`playLabel_${elementID}`);
            if (playLabel) {
              playLabel.visible = true;
            }
          }

          break;

        case 'Image':
          if (this.popupCallback) this.popupCallback(userData);
          break;

        case 'Floor':
        case 'visitorLocation':
        case 'Room': {
          const point = clickedObject.point.clone();
          const raycaster = new Raycaster(this.visitor.position, point.clone().sub(this.visitor.position).normalize());
          raycaster.far = this.visitor.position.distanceTo(point);

          const walls = this.scene.children.filter(obj => obj.userData.type === 'Wall');
          const hits = raycaster.intersectObjects(walls, true);

          if (hits.length > 0) {
            console.warn("Blocked: wall in the way.");
            return;
          }

          console.log('Moving visitor', clickedObject);
          this._moveVisitor(clickedObject);
          break;
        }

        default:
          console.log(`Unhandled object type: ${type}`);
      }
    }
  }

  _moveVisitor(clickedObject) {
    const clickedPoint = clickedObject.point.clone();
    this.visitor.target = clickedPoint;
    this.visitor.isAutoMoving = true;
  }

  _moveToVideo(clickedObject) {

    // close sidebar if open
    if (this.sidebar?.classList.contains('open')) {
      this.sidebar.classList.remove('open');
      this.btn?.classList.remove('open');
    }

    const mesh = clickedObject.object;
    const camera = this.camera;
    const visitor = this.visitor;

    // 1) Block if a wall is in the way
    const clickPoint = clickedObject.point.clone();
    const dirToClick = clickPoint.clone().sub(visitor.position).normalize();
    const blockerRay = new THREE.Raycaster(visitor.position, dirToClick);
    blockerRay.far = visitor.position.distanceTo(clickPoint);
    const walls = this.scene.children.filter(o => o.userData.type === 'Wall');
    if (blockerRay.intersectObjects(walls, true).length > 0) {
      console.warn("Blocked: wall in the way.");
      return;
    }

    // 2) Make sure we have a boundingBox
    const geom = mesh.geometry;
    if (!geom.boundingBox) {
      geom.computeBoundingBox();
      if (!geom.boundingBox) {
        console.error("Could not compute boundingBox for mesh:", mesh);
        return;
      }
    }
    const bbox = geom.boundingBox;

    // 3) Make sure we have a face normal
    if (!clickedObject.face || !clickedObject.face.normal) {
      console.error("No face normal on clickedObject", clickedObject);
      return;
    }
    const localNormal = clickedObject.face.normal.clone();

    // 4) Compute true world-space width by projecting corners onto camera-right
    const { min, max } = bbox;
    const localCorners = [
      new THREE.Vector3(min.x, min.y, 0),
      new THREE.Vector3(max.x, min.y, 0),
      new THREE.Vector3(min.x, max.y, 0),
      new THREE.Vector3(max.x, max.y, 0),
    ];
    const worldCorners = localCorners.map(c => mesh.localToWorld(c));
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = camera.up.clone().cross(forward).normalize();
    const projs = worldCorners.map(c => c.clone().sub(camera.position).dot(right));
    const worldWidth = Math.max(...projs) - Math.min(...projs);

    // 5) Compute horizontal FOV & required distance
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const aspect = this.renderer.domElement.clientWidth
      / this.renderer.domElement.clientHeight;
    const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * aspect);
    const extraOffset = 0.5;
    const distance = (worldWidth / 2) / Math.tan(hFOV / 2) + extraOffset;

    // 6) Build the world-normal and back off by that distance
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const worldNormal = localNormal.applyMatrix3(normalMatrix).normalize();
    const centerLocal = bbox.getCenter(new THREE.Vector3());
    const centerWorld = mesh.localToWorld(centerLocal);
    if (worldNormal.dot(camera.position.clone().sub(centerWorld)) < 0) {
      worldNormal.negate();
    }
    const targetPos = centerWorld.clone().addScaledVector(worldNormal, distance);

    // 7) Finally hand it off
    this._moveVisitor({ point: targetPos });
  }





}
