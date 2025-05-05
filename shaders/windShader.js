export const windShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uWindStrength: { value: 0.1 }
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
    uniform float uWindStrength;

    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      uv.x += sin(uv.y * 10.0 + uTime) * uWindStrength;
      uv.y += cos(uv.x * 10.0 + uTime) * uWindStrength;
      vec4 color = texture2D(tDiffuse, uv);
      gl_FragColor = color;
    }
  `
};