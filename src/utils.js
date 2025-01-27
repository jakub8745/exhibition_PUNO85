export function disposeSceneObjects(scene) {
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

  export function handleVideos(scene, belongsTo) {
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

  export class AudioHandler {
    constructor() {
      this.audioObjects = [];
    }
    handleAudio(audioToTurn) {
      if (!audioToTurn || audioToTurn.type !== "Audio") {
        this.pauseAllAndUpdateIcons();
        return;
      }
  
      const { isPlaying } = audioToTurn;
      const { playIconImg, audioOn } = this.getIconsAndPlayIconImg();
  
      if (isPlaying) {
        playIconImg.src = "/icons/audioMuted.png";
        audioOn.src = "/icons/audioMuted.png";
        audioToTurn.stop();
      } else {
        audioToTurn.play();
        playIconImg.src = "/icons/audioButton.png";
        audioOn.src = "/icons/audioButton.png";
        this.removeAudioPlayOverlay();
      }
    }
  
    pauseAllAndUpdateIcons() {
      for (const el of this.audioObjects) {
  
        if (!el.children[0]) return
  
        el.children[0].pause();
      }
      const { playIconImg, audioOn } = this.getIconsAndPlayIconImg();
      playIconImg.src = "/icons/audioMuted.png";//   icons/audioMuted.png
      audioOn.src = "/icons/audioMuted.png";
    }
  
    getIconsAndPlayIconImg() {
      const playIconImg = document.querySelector("#play-icon img");
      const audioOn = document.querySelector("#audio-on");
      return { playIconImg, audioOn };
    }
  
    removeAudioPlayOverlay() {
      const element = document.querySelector(".overlay-for-audio-play");
      if (element) element.remove();
    }
  
  
  }



  export function handleAudio(intersectedFloor, audioHandler) {
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

  //
  export function handleLights(lightsToTurn, lightsToTurnValue) {
    for (const el of lightsToTurn) {
      el.visible = el.userData.name === lightsToTurnValue;
  
    }
  }
  
  // Add other utility functions as needed
  /*
  export function anotherUsefulFunction() {
    // Your other useful logic here
    console.log('Another useful function');
  }
  */


  export function startTransitionTween(scene, reverse) {
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