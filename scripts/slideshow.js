import { heatHazeShader } from '../shaders/heatHazeShader.js';
import { windShader } from '../shaders/windShader.js';
import { radialBlurShader } from '../shaders/radialBlurShader.js';
import { textTransitionShader } from '../shaders/textTransitionShader.js';

const imgSEQ = [
  'images/page-1.webp',
  'images/page-2.webp',
  'images/page-3.webp',
  'images/page-4.webp',
  'images/page-5.webp',
  'images/page-6.webp',
];

const textSEQ = [
  'images/text1.webp',
  'images/text2.webp',
  'images/text3.webp',
  'images/text4.webp',
  'images/text5.webp',
  'images/text6.webp',
];

// Create separate canvases for image and text layers
const imageCanvas = document.createElement('canvas');
const textCanvas = document.createElement('canvas');
const container = document.querySelector('.canvas-container');
container.appendChild(imageCanvas);
container.appendChild(textCanvas);

// Set positioning for text canvas to overlay on image canvas
textCanvas.style.position = 'absolute';
textCanvas.style.top = '0';
textCanvas.style.left = '50%';
textCanvas.style.transform = 'translateX(-50%)';
textCanvas.style.pointerEvents = 'none'; // Allow clicks to pass through

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 2216;
const IMAGE_ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT;

let imageCamera, textCamera, imageQuad, textQuad;
let nextImageIndex = 0;

function resizeRendererToDisplaySize() {
  const canvasHeight = window.innerHeight;
  const canvasWidth = Math.round(canvasHeight * (9 / 16.5));
  
  // Resize both canvases
  imageCanvas.width = canvasWidth;
  imageCanvas.height = canvasHeight;
  textCanvas.width = canvasWidth;
  textCanvas.height = canvasHeight;
  
  imageRenderer.setSize(canvasWidth, canvasHeight, false);
  textRenderer.setSize(canvasWidth, canvasHeight, false);
  // Center canvas via CSS (handled in styles.css)
}

// Create separate renderers for image and text
const imageRenderer = new THREE.WebGLRenderer({ canvas: imageCanvas, alpha: false });
const textRenderer = new THREE.WebGLRenderer({ canvas: textCanvas, alpha: true });
textRenderer.setClearColor(0x000000, 0); // Transparent background for text layer

// Set up cameras
imageCamera = new THREE.OrthographicCamera(-IMAGE_WIDTH / IMAGE_HEIGHT, IMAGE_WIDTH / IMAGE_HEIGHT, 1, -1, 0, 1);
textCamera = new THREE.OrthographicCamera(-IMAGE_WIDTH / IMAGE_HEIGHT, IMAGE_WIDTH / IMAGE_HEIGHT, 1, -1, 0, 1);

resizeRendererToDisplaySize();
window.addEventListener('resize', resizeRendererToDisplaySize);

// Create scenes
const imageScene = new THREE.Scene();
const textScene = new THREE.Scene();

// Set up texture loader
const textureLoader = new THREE.TextureLoader();

// Load textures for all images and text
const preloadTextures = () => {
  const imgTextures = imgSEQ.map(src => textureLoader.load(src));
  const textTextures = textSEQ.map(src => textureLoader.load(src));
  return { imgTextures, textTextures };
};

const { imgTextures, textTextures } = preloadTextures();

// Create materials for images with radial blur
const imageBaseMaterials = imgTextures.map(texture => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...radialBlurShader.uniforms,
      tDiffuse: { value: texture },
    },
    vertexShader: radialBlurShader.vertexShader,
    fragmentShader: radialBlurShader.fragmentShader
  });
  // Initialize with maximum blur that will transition to zero
  material.uniforms.uBlurStrength.value = 1.0;
  return material;
});

// Create materials for text transitions
const textBaseMaterials = textTextures.map(texture => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...textTransitionShader.uniforms,
      tDiffuse: { value: texture },
    },
    vertexShader: textTransitionShader.vertexShader,
    fragmentShader: textTransitionShader.fragmentShader,
    transparent: true
  });
  // Start with zero opacity
  material.uniforms.uTransitionProgress.value = 0.0;
  return material;
});

// Initialize with the first image and text
imageQuad = new THREE.Mesh(
  new THREE.PlaneGeometry(IMAGE_ASPECT * 2, 2),
  imageBaseMaterials[0]
);
imageScene.add(imageQuad);

textQuad = new THREE.Mesh(
  new THREE.PlaneGeometry(IMAGE_ASPECT * 2, 2),
  textBaseMaterials[0]
);
textScene.add(textQuad);

// Animation phases and timing
let currentIndex = 0;
let phase = 'fadein'; // 'fadein', 'stay', 'fadeout', 'transition'
let phaseTime = 0;
const bpm = 125;
const beat = 60 / bpm;
const fadeInBeats = 6, stayBeats = 6, fadeOutBeats = 4, transitionBeats = 2;
const fadeInTime = fadeInBeats * beat;
const stayTime = stayBeats * beat;
const fadeOutTime = fadeOutBeats * beat;
const transitionTime = transitionBeats * beat;
const totalTime = fadeInTime + stayTime + fadeOutTime + transitionTime;

// Phase handlers for images and text
const imagePhaseHandlers = {
  fadein: () => {
    const progress = Math.min(phaseTime / fadeInTime, 1);
    const blurStrength = 1.0 - progress; // Blur from 1.0 (full) to 0.0 (none)
    imageQuad.material.uniforms.uBlurStrength.value = blurStrength;
    
    if (phaseTime >= fadeInTime) {
      phase = 'stay';
      phaseTime = 0;
    }
  },
  stay: () => {
    // Keep blur at minimum during stay phase
    imageQuad.material.uniforms.uBlurStrength.value = 0.0;
    
    if (phaseTime >= stayTime) {
      phase = 'fadeout';
      phaseTime = 0;
    }
  },
  fadeout: () => {
    const progress = Math.min(phaseTime / fadeOutTime, 1);
    const blurStrength = progress; // Blur from 0.0 (none) to 1.0 (full)
    imageQuad.material.uniforms.uBlurStrength.value = blurStrength;
    
    if (phaseTime >= fadeOutTime) {
      phase = 'transition';
      phaseTime = 0;
      prepareForTransition();
    }
  },
  transition: () => {
    const progress = Math.min(phaseTime / transitionTime, 1);
    imageQuad.material.uniforms.uTransitionProgress.value = progress;
    
    if (phaseTime >= transitionTime) {
      // Move to next image
      currentIndex = (currentIndex + 1) % imgSEQ.length;
      imageQuad.material = imageBaseMaterials[currentIndex];
      textQuad.material = textBaseMaterials[currentIndex];
      
      // Reset for fade-in of new image
      imageQuad.material.uniforms.uBlurStrength.value = 1.0;
      textQuad.material.uniforms.uTransitionProgress.value = 0.0;
      
      phase = 'fadein';
      phaseTime = 0;
    }
  }
};

const textPhaseHandlers = {
  fadein: () => {
    const progress = Math.min(phaseTime / fadeInTime, 1);
    textQuad.material.uniforms.uTransitionProgress.value = progress;
  },
  stay: () => {
    // Keep text fully visible during stay
    textQuad.material.uniforms.uTransitionProgress.value = 1.0;
  },
  fadeout: () => {
    const progress = Math.min(phaseTime / fadeOutTime, 1);
    // Start fading out text - from 1.0 to 0.0
    textQuad.material.uniforms.uTransitionProgress.value = 1.0 - progress;
  },
  transition: () => {
    // Text is fully transparent during transition, handled by image transition
    textQuad.material.uniforms.uTransitionProgress.value = 0.0;
  }
};

// Function to prepare materials for transition
function prepareForTransition() {
  const nextIndex = (currentIndex + 1) % imgSEQ.length;
  
  // Set up image transition
  imageQuad.material.uniforms.tNextTexture.value = imgTextures[nextIndex];
  imageQuad.material.uniforms.uTransitionProgress.value = 0.0;
  
  // Text transition is handled separately
  textQuad.material.uniforms.tNextTexture.value = textTextures[nextIndex];
}

// Animation clock
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  phaseTime += delta;

  // Update debug info if needed
  const debugDiv = document.getElementById('debug-info');
  if (debugDiv) {
    const blurVal = imageQuad.material.uniforms.uBlurStrength.value;
    debugDiv.textContent = `Phase: ${phase}, Blur: ${blurVal.toFixed(3)}, Image: ${currentIndex + 1}/${imgSEQ.length}`;
  }

  // Handle phase updates for both image and text
  if (imagePhaseHandlers[phase]) imagePhaseHandlers[phase]();
  if (textPhaseHandlers[phase]) textPhaseHandlers[phase]();

  // Render both scenes
  imageRenderer.render(imageScene, imageCamera);
  textRenderer.render(textScene, textCamera);
}

// Start animation
animate();