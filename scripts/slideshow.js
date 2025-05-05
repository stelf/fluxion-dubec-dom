import { heatHazeShader } from '../shaders/heatHazeShader.js';
import { windShader } from '../shaders/windShader.js';

const imgSEQ = [
  'images/page-1.png',
  'images/page-2.png',
  'images/page-3.png',
  'images/page-4.png',
  'images/page-5.png',
  'images/page-6.png',
];

const canvas = document.createElement('canvas');
const container = document.querySelector('.canvas-container');
container.appendChild(canvas);

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 2216;
const IMAGE_ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT;

let camera, quad;

function resizeRendererToDisplaySize() {
  const canvasHeight = window.innerHeight;
  const canvasWidth = Math.round(canvasHeight * (9 / 16.5));
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  renderer.setSize(canvasWidth, canvasHeight, false);
  // Center canvas via CSS (handled in styles.css)
  // Adjust camera and plane if needed
}

const renderer = new THREE.WebGLRenderer({ canvas });

camera = new THREE.OrthographicCamera(-IMAGE_WIDTH / IMAGE_HEIGHT, IMAGE_WIDTH / IMAGE_HEIGHT, 1, -1, 0, 1);

resizeRendererToDisplaySize();
window.addEventListener('resize', resizeRendererToDisplaySize);

const scene = new THREE.Scene();

const textureLoader = new THREE.TextureLoader();
const materials = imgSEQ.map((img) => {
  const texture = textureLoader.load(img);
  return new THREE.ShaderMaterial({
    uniforms: { ...heatHazeShader.uniforms, tDiffuse: { value: texture } },
    vertexShader: heatHazeShader.vertexShader,
    fragmentShader: heatHazeShader.fragmentShader
  });
});

quad = new THREE.Mesh(new THREE.PlaneGeometry(IMAGE_ASPECT * 2, 2), materials[0]);
scene.add(quad);

let currentIndex = 0;
let phase = 'fadein'; // 'fadein', 'wavehold', 'stay', 'fadeout'
let phaseTime = 0;
const bpm = 125;
const beat = 60 / bpm;
const fadeInBeats = 6, waveHoldBeats = 4, stayBeats = 6, fadeOutBeats = 4;
const fadeInTime = fadeInBeats * beat;
const waveHoldTime = waveHoldBeats * beat;
const stayTime = stayBeats * beat;
const fadeOutTime = fadeOutBeats * beat;
const totalTime = fadeInTime + waveHoldTime + stayTime + fadeOutTime;

const waveStart = 25, waveEnd = 5;
const noiseStart = 0.03, noiseEnd = 0.002;

function setMaterialForPhase(idx, phase) {
  if (phase === 'fadeout') {
    // Switch to wind shader for fadeout
    const texture = materials[idx].uniforms.tDiffuse.value;
    quad.material = new THREE.ShaderMaterial({
      uniforms: { ...windShader.uniforms, tDiffuse: { value: texture } },
      vertexShader: windShader.vertexShader,
      fragmentShader: windShader.fragmentShader
    });
  } else {
    // Use heat haze shader for fadein/wavehold/stay
    quad.material = materials[idx];
  }
}

let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  phaseTime += delta;

  // Print noise value
  const noiseDiv = document.getElementById('noise-value');
  let noiseVal = 0;
  if (phase === 'fadeout') {
    noiseVal = noiseEnd;
  } else {
    noiseVal = materials[currentIndex].uniforms.uNoiseAmount.value;
  }
  noiseDiv.textContent = `Noise: ${noiseVal.toFixed(5)}`;

  if (phase === 'fadein') {
    // Animate noise and wave frequency
    const t = Math.min(phaseTime / fadeInTime, 1);
    materials[currentIndex].uniforms.uNoiseAmount.value = noiseStart + (noiseEnd - noiseStart) * t;
    materials[currentIndex].uniforms.uWaveFrequency.value = waveStart + (waveEnd - waveStart) * t;
    if (phaseTime >= fadeInTime) {
      phase = 'wavehold';
      phaseTime = 0;
    }
  } else if (phase === 'wavehold') {
    // Hold uWaveFrequency at waveEnd for 4 beats
    materials[currentIndex].uniforms.uNoiseAmount.value = noiseEnd;
    materials[currentIndex].uniforms.uWaveFrequency.value = waveEnd;
    if (phaseTime >= waveHoldTime) {
      phase = 'stay';
      phaseTime = 0;
    }
  } else if (phase === 'stay') {
    // Hold steady
    materials[currentIndex].uniforms.uNoiseAmount.value = noiseEnd;
    materials[currentIndex].uniforms.uWaveFrequency.value = waveEnd;
    if (phaseTime >= stayTime) {
      phase = 'fadeout';
      phaseTime = 0;
      setMaterialForPhase(currentIndex, 'fadeout');
    }
  } else if (phase === 'fadeout') {
    // Animate wind
    const t = Math.min(phaseTime / fadeOutTime, 1);
    quad.material.uniforms.uWindStrength.value = t * 0.2; // max wind
    if (phaseTime >= fadeOutTime) {
      // Next image
      currentIndex = (currentIndex + 1) % materials.length;
      phase = 'fadein';
      phaseTime = 0;
      setMaterialForPhase(currentIndex, 'fadein');
    }
  }

  renderer.render(scene, camera);
}

setMaterialForPhase(currentIndex, 'fadein');
animate();