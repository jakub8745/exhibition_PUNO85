import { Mesh, Line3, Vector3, Raycaster, MeshStandardMaterial, Box3, Matrix4, Scene } from 'three';
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export default class Visitor extends Mesh {
  constructor(deps) {

    //deps

    const geometry = new RoundedBoxGeometry(0.3, 0.3, 0.2, 2, 0.5);
    const material = new MeshStandardMaterial();
    const { params, camera, controls, sceneMap, visitorEnter } = deps;

    super(geometry, material);//

    this.name = "visitor";
    this.capsuleInfo = {
      radius: 0.2,
      segment: new Line3(
        new Vector3(),
        new Vector3(0.2, 0.1, 0.2)
      ),
    };

    this.castShadow = false;
    this.material.wireframe = true;
    this.visible = false;


    this.mainScene = new Scene();
    this.mainScene.name = "mainScene";

    this.exhibitScene = new Scene();
    this.exhibitScene.name = "exhibitScene";

    this.deps = deps;

    this.controls = deps.controls;


    this.sceneMap = sceneMap;

    this.camera = camera;
    this.controls = controls;

    this.newPosition = new Vector3();
    this.deltaVector = new Vector3();


    this.raycaster = new Raycaster();
    this.downVector = new Vector3(0, -1, 0);
    this.intersectedObjects = [];

    this.tempVector2 = new Vector3();
    this.tempBox = new Box3();
    this.tempMat = new Matrix4();
    this.tempSegment = new Line3();
    this.tempVector = new Vector3();
    this.visitorVelocity = new Vector3();
    this.visitorIsOnGround = true;
    //this.isVisitorOnMainScene = isVisitorOnMainScene;

    this.params = deps.params;

    this.fwdPressed = false;
    this.bkdPressed = false;
    this.lftPressed = false;
    this.rgtPressed = false;
    this.upVector = new Vector3(0, 1, 0); // Default up vector

    this.target = visitorEnter

    deps.visitor = this;

    this.lastFloorName = this.mainScene.name

  }


  update(delta, collider) {

    // Update vertical velocity based on whether the visitor is on the ground
    if (this.visitorIsOnGround) {
      this.visitorVelocity.y = delta * this.params.gravity;
    } else {
      this.visitorVelocity.y += delta * this.params.gravity;
    }

    // Move the visitor based on controls
    const angle = this.controls.getAzimuthalAngle();

    if (this.fwdPressed) {
      this.tempVector.set(0, 0, -1).applyAxisAngle(this.upVector, angle);
      this.position.addScaledVector(this.tempVector, this.params.visitorSpeed * delta);
    }

    if (this.bkdPressed) {
      this.tempVector.set(0, 0, 1).applyAxisAngle(this.upVector, angle);
      this.position.addScaledVector(this.tempVector, this.params.visitorSpeed * delta);
    }

    if (this.lftPressed) {
      this.tempVector.set(-1, 0, 0).applyAxisAngle(this.upVector, angle);
      this.position.addScaledVector(this.tempVector, this.params.visitorSpeed * delta);
    }

    if (this.rgtPressed) {
      this.tempVector.set(1, 0, 0).applyAxisAngle(this.upVector, angle);
      this.position.addScaledVector(this.tempVector, this.params.visitorSpeed * delta);
    }
    // update visitor position
    this.position.addScaledVector(this.visitorVelocity, delta);

    this.updateMatrixWorld();

    // handle collisions
    this.handleCollisions(delta, collider);

    //

    const currentFloor = this.checkLocation();

    if (currentFloor && currentFloor.name !== this.lastFloorName) {
      this.lastFloorName = currentFloor.name;

      return { changed: true, newFloor: currentFloor };
    }

    return { changed: false, newFloor: null };
  }

  checkLocation() {

    this.raycaster.firstHitOnly = true;
    this.raycaster.set(this.position, this.downVector);
    const intersectedObjects = this.raycaster.intersectObjects(this.parent.children, true);

    const floor = intersectedObjects.find(({ object }) => {
      const type = object.userData.type;
      return type === "visitorLocation" || type === "Room";
    })?.object;

    //console.log("floor: ", floor);


    return floor
  }



  moveToScene(newScene, callback) {
    this.scene = this.parent;

    if (this.scene) {
      this.scene.remove(this);
    }


    this.scene = newScene;
    this.scene.add(this);

    // Trigger the callback when the visitor is moved to the scene
    if (callback && typeof callback === 'function') {
      callback();
    }
  }


  handleCollisions(delta, collider) {
    // adjust visitor position based on collisions
    const capsuleInfo = this.capsuleInfo;
    this.tempBox.makeEmpty();
    this.tempMat.copy(collider.matrixWorld).invert();
    this.tempSegment.copy(capsuleInfo.segment);

    // get the position of the capsule in the local space of the collider
    this.tempSegment.start.applyMatrix4(this.matrixWorld).applyMatrix4(this.tempMat);
    this.tempSegment.end.applyMatrix4(this.matrixWorld).applyMatrix4(this.tempMat);

    // get the axis aligned bounding box of the capsule
    this.tempBox.expandByPoint(this.tempSegment.start);
    this.tempBox.expandByPoint(this.tempSegment.end);

    this.tempBox.min.addScalar(-capsuleInfo.radius);
    this.tempBox.max.addScalar(capsuleInfo.radius);

    collider.geometry.boundsTree.shapecast({
      intersectsBounds: (box) => box.intersectsBox(this.tempBox),

      intersectsTriangle: (tri) => {
        // check if the triangle is intersecting the capsule and adjust the
        // capsule position if it is.
        const triPoint = this.tempVector;
        const capsulePoint = this.tempVector2;

        const distance = tri.closestPointToSegment(
          this.tempSegment,
          triPoint,
          capsulePoint
        );
        if (distance < capsuleInfo.radius) {
          const depth = capsuleInfo.radius - distance;
          const direction = capsulePoint.sub(triPoint).normalize();

          this.tempSegment.start.addScaledVector(direction, depth);
          this.tempSegment.end.addScaledVector(direction, depth);
        }
      },
    });

    // get the adjusted position of the capsule collider in world space after checking
    // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
    // the origin of the visitor model.
    this.newPosition = this.tempVector;
    this.newPosition.copy(this.tempSegment.start).applyMatrix4(collider.matrixWorld);

    // check how much the collider was moved
    this.deltaVector = this.tempVector2;
    this.deltaVector.subVectors(this.newPosition, this.position);

    // if the visitor was primarily adjusted vertically we assume it's on something we should consider ground
    this.visitorIsOnGround =
      this.deltaVector.y > Math.abs(delta * this.visitorVelocity.y * 0.25); ///

    const offset = Math.max(0.0, this.deltaVector.length() - 1e-5);
    this.deltaVector.normalize().multiplyScalar(offset);

    // adjust the visitor model
    this.position.add(this.deltaVector);

    if (!this.visitorIsOnGround) {
      this.deltaVector.normalize();
      this.visitorVelocity.addScaledVector(
        this.deltaVector,
        -this.deltaVector.dot(this.visitorVelocity)
      );
    } else {
      this.visitorVelocity.set(0, 0, 0);
    }

    // offset the camera 
    this.tempVector.copy(this.position).add(this.params.heightOffset);

    this.camera.position.sub(this.controls.target);
    this.controls.target.copy(this.tempVector);
    this.camera.position.add(this.tempVector);

    //
    const target = this.position.clone();
    target.add(new Vector3(0, 0, 0));
    this.sceneMap.getObjectByName("circleMap").position.copy(target);

    // if the visitor has fallen too far below the level reset their position to the start
    if (this.position.y < -10) {

      this.reset();
    }

  }

  reset() {

    this.deps.resetVisitor();

  }


}
