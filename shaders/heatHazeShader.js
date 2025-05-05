export const heatHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uDistortionX: { value: 0.01 },
    uDistortionY: { value: 0.01 },
    uNoiseAmount: { value: 0.002 },
    uWaveFrequency: { value: 10.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uDistortionX;
    uniform float uDistortionY;
    uniform float uNoiseAmount;
    uniform float uWaveFrequency;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * uWaveFrequency + uTime) * uDistortionX;
      uv.y += cos(uv.x * uWaveFrequency + uTime) * uDistortionY;
      vec4 color = texture2D(tDiffuse, uv);
      color.rgb += vec3(uNoiseAmount * (fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453)));
      gl_FragColor = color;
    }
  `
};