export const heatHazeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uDistortionX: { value: 0.01 },
    uDistortionY: { value: 0.01 },
    uNoiseAmount: { value: 0.002 },
    uWaveFrequency: { value: 10.0 },
    uBlurAmount: { value: 0.0 }
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
    uniform float uWaveFrequency;
    uniform float uBlurAmount;
    varying vec2 vUv;

    // 9-tap Gaussian blur kernel weights
    const float kernel[9] = float[9](0.05, 0.09, 0.12, 0.15, 0.18, 0.15, 0.12, 0.09, 0.05);

    vec4 gaussianBlur(sampler2D image, vec2 uv, float radius) {
      vec4 sum = vec4(0.0);
      float total = 0.0;
      for (int x = -4; x <= 4; x++) {
        for (int y = -4; y <= 4; y++) {
          float weight = kernel[x+4] * kernel[y+4];
          vec2 offset = vec2(float(x), float(y)) * radius;
          sum += texture2D(image, uv + offset) * weight;
          total += weight;
        }
      }
      return sum / total;
    }

    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * uWaveFrequency + uTime) * uDistortionX;
      uv.y += cos(uv.x * uWaveFrequency + uTime) * uDistortionY;
      vec4 color = gaussianBlur(tDiffuse, uv, uBlurAmount);
      gl_FragColor = color;
    }
  `
};