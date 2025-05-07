export const radialBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uBlurRadius: { value: 1 }, // Full width
    uBlurStrength: { value: 1.0 }, // Blur intensity (0 = no blur, 1 = full blur)
    uCenterX: { value: 0.5 }, // Center of the blur effect (0-1)
    uCenterY: { value: 0.5 }, // Center of the blur effect (0-1)
    uTransitionProgress: { value: 0.0 }, // For cross-fading between images (0-1)
    tNextTexture: { value: null }, // For transitioning to next image
    uBackgroundColor: { value: [1/255, 7/255, 19/255] } // Default background color
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
    uniform float uBlurRadius;
    uniform float uBlurStrength;
    uniform float uCenterX;
    uniform float uCenterY;
    uniform float uTransitionProgress;
    uniform vec3 uBackgroundColor;
    varying vec2 vUv;

    // Signed distance function for circle
    float sdCircle(vec2 p, vec2 center, float radius) {
      return length(p - center) - radius;
    }

    // Smoothstep function for creating smooth transitions
    float smoothEdge(float distance, float edge) {
      return 1.0 - smoothstep(0.0, edge, distance);
    }

    void main() {
      vec2 center = vec2(uCenterX, uCenterY);
      vec2 uv = vUv;
      
      // Calculate distance from current pixel to center
      float dist = length(uv - center);
      
      // Normalize distance based on blur radius
      float normalizedDist = dist / uBlurRadius;
      
      // Calculate blur amount based on distance and blur strength
      float blurAmount = clamp(normalizedDist * uBlurStrength, 0.0, 1.0);
      
      // Sample colors with different blur radii for radial blur effect
      vec4 color = vec4(0.0);
      const int samples = 100; // Number of samples for blur
      
      for (int i = 0; i < samples; i++) {
        float t = float(i) / float(samples - 1);
        float radius = mix(0.0, 0.1 * blurAmount, t); // Gradually increase sample radius
        float angle = t * 3.14159 * 3.0; // Sample in a circular pattern
        
        vec2 offset = vec2(cos(angle), sin(angle)) * radius;
        color += texture2D(tDiffuse, uv + offset);
      }
      color /= float(samples);
      
      // If alpha is less than 1, blend with background color
      if (color.a < 1.0) {
        color.rgb = mix(uBackgroundColor, color.rgb, color.a);
        color.a = 1.0; // Make fully opaque after blending with background
      }
      
      // Handle transition between images if needed
      if (uTransitionProgress > 0.0) {
        vec4 nextColor = vec4(0.0);
        for (int i = 0; i < samples; i++) {
          float t = float(i) / float(samples - 1);
          float radius = mix(0.0, 0.05 * blurAmount, t);
          float angle = t * 3.14159 * 2.0;
          
          vec2 offset = vec2(cos(angle), sin(angle)) * radius;
          nextColor += texture2D(tNextTexture, uv + offset);
        }
        nextColor /= float(samples);
        
        // If next image has alpha, blend with background
        if (nextColor.a < 1.0) {
          nextColor.rgb = mix(uBackgroundColor, nextColor.rgb, nextColor.a);
          nextColor.a = 1.0;
        }
        
        // Blend between current and next image
        color = mix(color, nextColor, uTransitionProgress);
      }
      
      gl_FragColor = color;
    }
  `
};