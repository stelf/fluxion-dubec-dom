// Image state machine module

// State definitions
export const ImageStates = {
  FADE_IN: 'fadein',
  STAY: 'stay',
  FADE_OUT: 'fadeout'
};

  // Create and configure image state machine
export function createImageStateMachine(bpm, imageQuad, imgTextures, imageBaseMaterials) {
  // Animation timing constants
  const beat = 60 / bpm;
  const imgFadeInBeats = 8;
  const imgStayBeats = 0;
  const imgFadeOutBeats = 8;
  
  const imgFadeInTime = imgFadeInBeats * beat;
  const imgStayTime = imgStayBeats * beat;
  const imgFadeOutTime = imgFadeOutBeats * beat;
  
  // Current state
  let currentImgIndex = 0;
  let imgPhase = ImageStates.FADE_IN;
  let imgPhaseTime = 0;

  // State handlers for each phase of image animation
  const imagePhaseHandlers = {
    // Phase 1: Image blurs in
    [ImageStates.FADE_IN]: (delta) => {
      imgPhaseTime += delta;
      const progress = Math.min(imgPhaseTime / imgFadeInTime, 1);
      const blurStrength = 1.0 - progress; // Blur reducing from 1.0 to 0.0
      imageQuad.material.uniforms.uBlurStrength.value = blurStrength;
      
      if (imgPhaseTime >= imgFadeInTime) {
        imgPhase = ImageStates.STAY;
        imgPhaseTime = 0;
      }
      
      return false; // Image index hasn't changed
    },
    
    // Phase 2: Image stays clear
    [ImageStates.STAY]: (delta) => {
      imgPhaseTime += delta;
      imageQuad.material.uniforms.uBlurStrength.value = 0.0;
      
      if (imgPhaseTime >= imgStayTime) {
        imgPhase = ImageStates.FADE_OUT;
        imgPhaseTime = 0;
        
        // Prepare for transition to next image
        const nextImgIndex = (currentImgIndex + 1) % imgTextures.length;
        imageQuad.material.uniforms.tNextTexture.value = imgTextures[nextImgIndex];
        imageQuad.material.uniforms.uTransitionProgress.value = 0.0;
      }
      
      return false; // Image index hasn't changed
    },
    
    // Phase 3: Image blurs out and transitions to next
    [ImageStates.FADE_OUT]: (delta) => {
      imgPhaseTime += delta;
      const progress = Math.min(imgPhaseTime / imgFadeOutTime, 1);
      const blurStrength = progress; // Blur increasing from 0.0 to 1.0
      imageQuad.material.uniforms.uBlurStrength.value = blurStrength;
      
      // Start the transition to the next image only in the second half of the FADE_OUT phase
      // and make it transition fully from 0 to 1 in that second half.
      let transitionProgressValue = 0.0;
      if (progress > 0.5) { // Start transition after 50% of fade out time
        // Map the second half of 'progress' (0.5 to 1.0) to a new range (0.0 to 1.0)
        transitionProgressValue = (progress - 0.5) * 2; 
      }
      imageQuad.material.uniforms.uTransitionProgress.value = transitionProgressValue;
      
      let imageIndexChanged = false;
      if (imgPhaseTime >= imgFadeOutTime) {
        // Move to next image
        currentImgIndex = (currentImgIndex + 1) % imgTextures.length;
        
        // Update the material to the new image's material
        imageQuad.material = imageBaseMaterials[currentImgIndex];
        imageQuad.material.uniforms.uBlurStrength.value = 1.0; // Start fully blurred
        imageQuad.material.uniforms.uTransitionProgress.value = 0.0; // Reset for the new image
        
        imgPhase = ImageStates.FADE_IN;
        imgPhaseTime = 0;
        imageIndexChanged = true;
      }
      
      return imageIndexChanged;
    }
  };

  // Method to update the state machine
  const update = (delta) => {
    // Return value indicates if the image index has changed
    return imagePhaseHandlers[imgPhase](delta);
  };
  
  // Method to get current state information
  const getState = () => {
    return {
      currentImgIndex,
      imgPhase,
      imgPhaseTime
    };
  };
  
  // Method to set state (used when resuming animation)
  const setState = (state) => {
    currentImgIndex = state.currentImgIndex;
    imgPhase = state.imgPhase;
    imgPhaseTime = state.imgPhaseTime;
  };
  
  // Method to switch to a specific image
  const setImage = (index, materials) => {
    currentImgIndex = index;
    imageQuad.material = materials[currentImgIndex];
  };
  
  // Method to check if the animation is complete
  const isComplete = (totalImages) => {
    return currentImgIndex === totalImages - 1 && 
           imgPhase === ImageStates.FADE_OUT &&
           imgPhaseTime >= imgFadeOutTime;
  };
  
  // Return the public interface
  return {
    update,
    getState,
    setState,
    setImage,
    isComplete,
    get currentIndex() { return currentImgIndex; },
    get phase() { return imgPhase; },
    get timing() { 
      return { 
        imgFadeInTime, 
        imgStayTime, 
        imgFadeOutTime 
      }; 
    }
  };
}
