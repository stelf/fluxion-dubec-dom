import { setupScene, createMaterials, createQuads } from './sceneSetup.js';
import { createImageStateMachine } from './imageStateMachine.js';
import { createTextStateMachine } from './textStateMachine.js';

// Image and text sequences
const imgSEQ = [
  'images/page-1.webp',
  'images/page-3.webp',
  'images/page-2.webp',
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

// Shared constants
const bpm = 123;

// Set up scene components
const container = document.querySelector('.canvas-container');
const {
  imageRenderer, textRenderer,
  imageCamera, textCamera,
  imageScene, textScene,
  IMAGE_ASPECT
} = setupScene(container);

// Create materials
const {
  imgTextures, textTextures,
  imageBaseMaterials, textBaseMaterials
} = createMaterials(imgSEQ, textSEQ);

// Create quads
const {
  imageQuad, textQuad1, textQuad2
} = createQuads(imageScene, textScene, IMAGE_ASPECT, imageBaseMaterials[0]);

// Initialize state machines
const imageStateMachine = createImageStateMachine(bpm, imageQuad, imgTextures, imageBaseMaterials);
const textStateMachine = createTextStateMachine(bpm, textQuad1, textQuad2, textBaseMaterials);

// Animation control
let clock = new THREE.Clock();
let animationFrameId = null; // To control the animation loop
let animationRunning = false; // To prevent multiple simultaneous animations
let savedState = null; // Save state when stopping animation

function startAnimationCycle() {
  if (animationRunning) return; // Don't start if already running
  animationRunning = true;

  if (savedState) {
    // Resume from where we left off
    console.log("Resuming animation from saved state");
    
    // Restore state to both state machines
    imageStateMachine.setState(savedState.imageState);
    textStateMachine.setState(savedState.textState);
    
    // Restore visual state for image
    imageQuad.material = imageBaseMaterials[savedState.imageState.currentImgIndex];
    imageQuad.material.uniforms.uBlurStrength.value = savedState.blurStrength;
    
    savedState = null; // Clear saved state
  } else {
    // Start fresh
    console.log("Starting new animation cycle");
    
    // Set up initial image
    imageQuad.material = imageBaseMaterials[0];
    imageQuad.material.uniforms.uBlurStrength.value = 1.0; // Start fully blurred
    imageStateMachine.setImage(0, imageBaseMaterials);
    
    // Initialize text state machine
    textStateMachine.initialize();
  }
  
  clock.start(); // Start/resume the clock
  
  // Cancel any previous animation frame to avoid conflicts
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animate(); // Start the animation loop
}

function animate() {
  animationFrameId = requestAnimationFrame(animate); // Store the frame ID
  const delta = clock.getDelta();
  
  // Update image state machine
  const imageIndexChanged = imageStateMachine.update(delta);
  
  // Update text state machine, passing current image index for synchronization
  textStateMachine.update(delta, imageStateMachine.currentIndex);

  // Log debug info to console - only occasionally to avoid flooding
  if (Math.floor(performance.now() / 100) % 5 === 0) {
    const blurVal = imageQuad.material.uniforms.uBlurStrength.value;
    const text1Val = textQuad1.visible ? 
      textQuad1.material.uniforms.uTransitionProgress.value.toFixed(2) : "0.00";
    const text2Val = textQuad2.visible ? 
      textQuad2.material.uniforms.uTransitionProgress.value.toFixed(2) : "0.00";
    
    console.log(
      `IMG[${imageStateMachine.phase}:${imageStateMachine.currentIndex + 1}/${imgSEQ.length}] ` +
      `Blur: ${blurVal.toFixed(2)}, ` +
      `TXT[${textStateMachine.phase}:${textStateMachine.currentIndex + 1}/${textSEQ.length}] ` +
      `T1: ${text1Val}, T2: ${text2Val}`
    );
  }

  // Render both scenes
  imageRenderer.render(imageScene, imageCamera);
  textRenderer.render(textScene, textCamera);

  // Check if one full cycle is complete
  if (imageStateMachine.isComplete(imgSEQ.length) && 
      textStateMachine.isComplete(textSEQ.length)) {
    cancelAnimationFrame(animationFrameId); // Stop the animation loop
    animationRunning = false; // Allow re-triggering
    console.log("Animation cycle complete - reached end of all images and texts.");
  }
}

// Function to stop the animation and save state
function stopAnimationCycle() {
  if (!animationRunning) return;
  
  // Save current state from both state machines
  savedState = {
    imageState: imageStateMachine.getState(),
    textState: textStateMachine.getState(),
    blurStrength: imageQuad.material.uniforms.uBlurStrength.value
  };
  
  // Cancel animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  clock.stop(); // Pause the clock
  animationRunning = false;
  console.log("Animation paused by user - state saved");
  
  // Toggle button visibility
  if (startButton && stopButton) {
    startButton.style.display = 'block';
    stopButton.style.display = 'none';
  }
}

// Add event listeners to buttons
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

if (startButton && stopButton) {
  // Start button event listener
  startButton.addEventListener('click', () => {
    startButton.style.display = 'none';
    stopButton.style.display = 'block';
    startAnimationCycle();
  });
  
  // Stop button event listener
  stopButton.addEventListener('click', stopAnimationCycle);
} else {
  console.error("Buttons not found");
}
