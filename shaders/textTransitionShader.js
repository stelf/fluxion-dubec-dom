export const textTransitionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTransitionProgress: { value: 0.0 }, // 0 to 1 transition progress
    uBackgroundColor: { value: [1/255, 7/255, 19/255] }, // RGB background color
    tNextTexture: { value: null } // For transitions between different text images
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
    uniform sampler2D tNextTexture;
    uniform float uTransitionProgress;
    uniform vec3 uBackgroundColor;
    varying vec2 vUv;

    void main() {
      vec4 currentTexture = texture2D(tDiffuse, vUv);
      
      // For fade-in: blend from background to texture color
      // The custom blend formula: background + (progress * (textColor - background))
      vec3 textColor = currentTexture.rgb;
      vec3 blendedColor = uBackgroundColor + (uTransitionProgress * (textColor - uBackgroundColor));
      
      // Respect the original alpha, also affected by transition progress
      float alpha = currentTexture.a * uTransitionProgress;
      
      // When transitioning between two text images
      if (uTransitionProgress > 1.0) {
        // This means we're in a between-images transition
        // transitionProgress > 1 means we're in fadeout phase from 1.0 to 2.0
        float fadeOutProgress = uTransitionProgress - 1.0; // 0 to 1 for fade out
        
        // Fade out current text
        alpha = currentTexture.a * (1.0 - fadeOutProgress);
        
        // If there's a next texture, prepare to fade it in
        if (fadeOutProgress > 0.5) {
          // Start fading in next texture at halfway point of the fade out
          float nextFadeIn = (fadeOutProgress - 0.5) * 2.0; // 0 to 1 in second half
          vec4 nextTexture = texture2D(tNextTexture, vUv);
          vec3 nextBlendedColor = uBackgroundColor + (nextFadeIn * (nextTexture.rgb - uBackgroundColor));
          float nextAlpha = nextTexture.a * nextFadeIn;
          
          // Blend between current fading out and next fading in
          blendedColor = mix(blendedColor, nextBlendedColor, nextFadeIn);
          alpha = mix(alpha, nextAlpha, nextFadeIn);
        }
      }
      
      gl_FragColor = vec4(blendedColor, alpha);
    }
  `
};