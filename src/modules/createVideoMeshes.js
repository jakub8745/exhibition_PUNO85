// src/modules/createVideoMeshes.js
import {
    PlaneGeometry,
    VideoTexture,
    MeshBasicMaterial,
    Mesh,
    DoubleSide,
    SRGBColorSpace,
    Vector3
} from 'three';

export function createVideoMeshes(scene) {
    scene.traverse(object => {
        if (object.isMesh && object.userData.type === "Video") {
            const videoId = object.userData.elementID;
            const video = document.getElementById(videoId);

            if (!video) {
                console.warn(`⚠️ No <video> element found with ID: ${videoId}`);
                return;
            }

            video.muted = true;
            video.currentTime = 0.01;

            const aspect = video.videoWidth / video.videoHeight || 1.77;
            const geometry = new PlaneGeometry(aspect, 1);
            const texture = new VideoTexture(video);
            texture.colorSpace = SRGBColorSpace;

            const material = new MeshBasicMaterial({
                map: texture,
                side: DoubleSide
            });

            const newMesh = new Mesh(geometry, material);
            newMesh.name = `videoMesh_${videoId}`;
            newMesh.userData = { type: "Video", elementID: "animacja85" };

            // position video close to original mesh (if any)
            const offset = new Vector3(-0.05, -0.65, -2.4);
            newMesh.position.copy(object.position.clone().add(offset));
            newMesh.scale.set(-3.8, 3.6, 1);
            newMesh.rotation.y = Math.PI / 2;

            scene.add(newMesh);
            console.log(`🎬 Added video mesh for #${videoId}`);
        }
    });
}
