import { radialBlurShader } from '../shaders/radialBlurShader.js';
import { textTransitionShader } from '../shaders/textTransitionShader.js';

// Constants for image dimensions and aspect ratio
const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 2216;
const IMAGE_ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT;

// Function to create and set up canvases, renderers, scenes, and cameras
export function setupScene(container) {
  // Create separate canvases for image and text layers
  const imageCanvas = document.createElement('canvas');
  const textCanvas = document.createElement('canvas');
  container.appendChild(imageCanvas);
  container.appendChild(textCanvas);

  // Set positioning for text canvas to overlay on image canvas
  textCanvas.style.position = 'absolute';
  textCanvas.style.top = '0';
  textCanvas.style.left = '50%';
  textCanvas.style.transform = 'translateX(-50%)';
  textCanvas.style.pointerEvents = 'none'; // Allow clicks to pass through

  // Create separate renderers for image and text
  const imageRenderer = new THREE.WebGLRenderer({ canvas: imageCanvas, alpha: false });
  const textRenderer = new THREE.WebGLRenderer({ canvas: textCanvas, alpha: true });
  textRenderer.setClearColor(0x000000, 0); // Transparent background for text layer

  // Set up cameras
  const imageCamera = new THREE.OrthographicCamera(
    -IMAGE_WIDTH / IMAGE_HEIGHT, 
    IMAGE_WIDTH / IMAGE_HEIGHT, 
    1, -1, 0, 1
  );
  
  const textCamera = new THREE.OrthographicCamera(
    -IMAGE_WIDTH / IMAGE_HEIGHT, 
    IMAGE_WIDTH / IMAGE_HEIGHT, 
    1, -1, 0, 1
  );

  // Create scenes
  const imageScene = new THREE.Scene();
  const textScene = new THREE.Scene();

  // Set up resize handler
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
  }

  // Initial resize
  resizeRendererToDisplaySize();
  window.addEventListener('resize', resizeRendererToDisplaySize);

  return {
    imageCanvas,
    textCanvas,
    imageRenderer,
    textRenderer,
    imageCamera,
    textCamera,
    imageScene,
    textScene,
    resizeRendererToDisplaySize,
    IMAGE_ASPECT
  };
}

// Function to load textures and create materials
export function createMaterials(imgSEQ, textSEQ) {
  // Set up texture loader
  const textureLoader = new THREE.TextureLoader();

  // Load textures for all images and text
  const imgTextures = imgSEQ.map(src => textureLoader.load(src));
  const textTextures = textSEQ.map(src => textureLoader.load(src));

  // Create materials for images with radial blur
  const imageBaseMaterials = imgTextures.map(texture => {
    // Create a deep copy of the uniforms to avoid sharing references
    const uniforms = {
      tDiffuse: { value: texture },
      uBlurRadius: { value: 1 },
      uBlurStrength: { value: 1.0 }, // Start with maximum blur
      uCenterX: { value: 0.5 },
      uCenterY: { value: 0.5 },
      uTransitionProgress: { value: 0.0 },
      tNextTexture: { value: null },
      uBackgroundColor: { value: [1/255, 7/255, 19/255] }
    };
    
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: radialBlurShader.vertexShader,
      fragmentShader: radialBlurShader.fragmentShader
    });
    
    return material;
  });

  // Create materials for text transitions
  const textBaseMaterials = textTextures.map(texture => {
    // Create a deep copy of the uniforms to avoid sharing references
    const uniforms = {
      tDiffuse: { value: texture },
      uTransitionProgress: { value: 0.0 },
      uBackgroundColor: { value: [1/255, 7/255, 19/255] },
      tNextTexture: { value: null }
    };
    
    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: textTransitionShader.vertexShader,
      fragmentShader: textTransitionShader.fragmentShader,
      transparent: true
    });
    
    return material;
  });

  return {
    imgTextures,
    textTextures,
    imageBaseMaterials,
    textBaseMaterials
  };
}

// Function to create mesh quads for image and text
export function createQuads(imageScene, textScene, IMAGE_ASPECT, imageMaterial) {
  // Initialize with the first image
  const imageQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(IMAGE_ASPECT * 2, 2),
    imageMaterial
  );
  imageScene.add(imageQuad);

  // Create two text quads - one for current text, one for previous text that persists
  const textQuad1 = new THREE.Mesh(
    new THREE.PlaneGeometry(IMAGE_ASPECT * 2, 2)
    // Material will be set in startAnimationCycle
  );
  textScene.add(textQuad1);

  const textQuad2 = new THREE.Mesh(
    new THREE.PlaneGeometry(IMAGE_ASPECT * 2, 2)
    // Material will be set in startAnimationCycle
  );
  textScene.add(textQuad2);

  return {
    imageQuad,
    textQuad1,
    textQuad2
  };
}
