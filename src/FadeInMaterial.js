import * as THREE from 'three';
//import { GUI } from 'https://cdn.skypack.dev/dat.gui';

export default class FadeInMaterial extends THREE.MeshLambertMaterial {
  static globalContrast = 2.7;
  static globalBrightness = 0.8; // Default brightness
  static guiInitialized = false;
  static instances = []; // Array to hold all instances

  constructor(options) {
    super(options);

    this.name = options.name || 'FadeInMaterial';
    this.fadeDuration = options.fadeDuration || 4000; // Duration of the fade-in animation in milliseconds
    this.fadeInterval = options.fadeInterval || 40; // Interval between opacity updates
    this.opacity = 0;
    this.isFadingIn = false;
    this.contrast = FadeInMaterial.globalContrast; // Use global contrast value
    this.brightness = FadeInMaterial.globalBrightness; // Use global brightness value
    this.setupShader(); // Setup the shader modification
    this.onLoad();

    FadeInMaterial.instances.push(this); // Add instance to the list

    // Initialize GUI for contrast and brightness control if not already done
    if (!FadeInMaterial.guiInitialized) {
      //this.setupGUI();
      FadeInMaterial.guiInitialized = true;
    }
  }

  setupShader() {
    this.onBeforeCompile = (shader) => {
      // Declare the contrast and brightness uniforms
      shader.uniforms.contrast = { value: this.contrast };
      shader.uniforms.brightness = { value: this.brightness };

      // Inject the contrast and brightness functions and uniform declarations
      shader.fragmentShader = `
        uniform float contrast;
        uniform float brightness;

        vec3 applyContrast(vec3 color, float contrast) {
          return (color - 0.5) * contrast + 0.5;
        }

        vec3 applyBrightness(vec3 color, float brightness) {
          return color * brightness;
        }
      ` + shader.fragmentShader;

      // Inject the contrast and brightness applications just before the dithering fragment
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <dithering_fragment>`,
        `
        // Apply brightness
        gl_FragColor.rgb = applyBrightness(gl_FragColor.rgb, brightness);

        // Apply contrast
        gl_FragColor.rgb = applyContrast(gl_FragColor.rgb, contrast);

        // Original dithering code
        #include <dithering_fragment>
        `
      );

      this.shader = shader; // Keep a reference to the shader for later updates
    };
  }

  onLoad() {
    this.fadeIn();
  }

  fadeIn() {
    if (this.isFadingIn) return;
    this.isFadingIn = true;

    const totalSteps = this.fadeDuration / this.fadeInterval;
    let currentStep = 0;

    const fadeIn = () => {
      if (currentStep >= totalSteps) {
        this.opacity = 1;
        this.isFadingIn = false;
        return;
      }

      const opacity = currentStep / totalSteps;
      this.opacity = opacity;

      currentStep++;
      requestAnimationFrame(fadeIn);
    };

    fadeIn();
  }

  static updateGlobalContrast(value) {
    FadeInMaterial.globalContrast = value;
    // Update contrast for all instances
    for (const instance of FadeInMaterial.instances) {
      if (instance.shader) {
        instance.shader.uniforms.contrast.value = value;
        instance.needsUpdate = true; // Mark the material as needing an update
      }
    }
  }

  static updateGlobalBrightness(value) {
    FadeInMaterial.globalBrightness = value;
    // Update brightness for all instances
    for (const instance of FadeInMaterial.instances) {
      if (instance.shader) {
        instance.shader.uniforms.brightness.value = value;
        instance.needsUpdate = true; // Mark the material as needing an update
      }
    }
  }

  setupGUI() {
    
    const gui = new GUI();
    const contrastController = gui.add(FadeInMaterial, 'globalContrast', 0.0, 3.0).name('Contrast');
    contrastController.onChange((value) => {
      FadeInMaterial.updateGlobalContrast(value); // Update the global contrast
    });

    const brightnessController = gui.add(FadeInMaterial, 'globalBrightness', 0.0, 3.0).name('Brightness');
    brightnessController.onChange((value) => {
      FadeInMaterial.updateGlobalBrightness(value); // Update the global brightness
    });

    gui.show(false);
  }
}
