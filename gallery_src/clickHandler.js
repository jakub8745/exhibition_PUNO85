// clickHandler.js
export function handleClick(event, scene, camera, cube, floor, circle, popup, controls) {
    
       // Raycaster
       const raycaster = new THREE.Raycaster();
       const pointer = new THREE.Vector2();

       // Popup DOM element
       const popup = document.getElementById('popup');
    
    
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;

        if (clickedObject === cube) {
            // Cube clicked - show popup
            popup.style.display = 'block';
        } else if (clickedObject === floor) {
            // Floor clicked - show circle
            const { point } = intersects[0];
            circle.position.set(point.x, point.y + 0.01, point.z);
            circle.visible = true;
            pulseScale = 1;

            if (circleTimeout) clearTimeout(circleTimeout);

            circleTimeout = setTimeout(() => {
                if (circle.visible) circle.visible = false;
            }, 3000);
        } else if (clickedObject === circle) {
            // Circle clicked - move camera closer
            camera.position.set(circle.position.x, 3, circle.position.z + 2);
            controls.update();
            circle.visible = false;
            if (circleTimeout) clearTimeout(circleTimeout);
        }
    }
}