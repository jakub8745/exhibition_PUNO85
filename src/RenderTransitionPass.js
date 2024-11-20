import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';



class RenderTransitionPass extends ShaderPass {
    constructor() {
        const transitionShader = {
            uniforms: {
                tScene1: { value: null },
                tScene2: { value: null },
                threshold: { value: 0 }, // Control the blend between scenes
                transitionTexture: { value: null }, // Optional transition texture
            },
            vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
            fragmentShader: `
          varying vec2 vUv;
          uniform sampler2D tScene1;
          uniform sampler2D tScene2;
          uniform float threshold;
          uniform sampler2D transitionTexture;
  
          void main() {
            vec4 scene1Color = texture2D(tScene1, vUv);
            vec4 scene2Color = texture2D(tScene2, vUv);
  
            // Optional texture-based transition
            float dissolve = threshold;
            if (transitionTexture != null) {
              dissolve *= texture2D(transitionTexture, vUv).r;
            }
  
            // Blend the two scenes based on dissolve factor
            gl_FragColor = mix(scene1Color, scene2Color, dissolve);
          }
        `,
        };

        super(new THREE.ShaderMaterial(transitionShader));
    }

    setScenes(scene1Texture, scene2Texture) {
        this.uniforms.tScene1.value = scene1Texture;
        this.uniforms.tScene2.value = scene2Texture;
    }

    setTextureThreshold(threshold) {
        this.uniforms.threshold.value = threshold;
    }

    setTransitionTexture(texture) {
        this.uniforms.transitionTexture.value = texture;
    }
}


export default RenderTransitionPass;