// Text state machine module

// State definitions
export const TextStates = {
  FADE_IN_EVEN: 'fade_in_2k',    // Text 2k fades in (e.g., 0, 2, 4...)
  STAY: 'stay',                  // Text 2k stays visible
  FADE_IN_ODD: 'fade_in_2k1',    // Text 2k stays while text 2k+1 fades in
  BOTH_STAY: 'both_stay',        // Both text 2k and 2k+1 stay visible
  BOTH_OUT: 'both_out'           // Both text 2k and 2k+1 fade out
};

// Create and configure text state machine
export function createTextStateMachine(bpm, textQuad1, textQuad2, textBaseMaterials) {
  // Animation timing constants
  const beat = 60 / bpm;
  const textFadeInBeats = 2;
  const textStayBeats = 2;
  const addNewTextBeats = 2;
  const bothStayBeats = 2;
  const bothOutBeats = 4;
  
  const textFadeInTime = textFadeInBeats * beat;
  const textStayTime = textStayBeats * beat;
  const addNewTextTime = addNewTextBeats * beat;
  const bothStayTime = bothStayBeats * beat;
  const bothOutTime = bothOutBeats * beat;
  
  // Current state
  let baseTextIndex = 0;  // Base index for the current pair (0, 2, 4...)
  let textPhase = TextStates.FADE_IN_EVEN;
  let textPhaseTime = 0;

  // State handlers for each phase of text animation
  const textPhaseHandlers = {
    // Phase 1: Even-indexed text fades in (2k)
    [TextStates.FADE_IN_EVEN]: (delta) => {
      textPhaseTime += delta;
      const progress = Math.min(textPhaseTime / textFadeInTime, 1);      
      // Set first quad to current text (2k)
      textQuad1.material = textBaseMaterials[baseTextIndex];
      textQuad1.visible = true;      
      textQuad1.material.uniforms.uTransitionProgress.value = progress;
      textQuad2.visible = false;
      
      if (textPhaseTime >= textFadeInTime) {
        textPhase = TextStates.STAY;
        textPhaseTime = 0;
      }
    },
    
    // Phase 2: Even-indexed text stays visible
    [TextStates.STAY]: (delta) => {
      textPhaseTime += delta;
      
      // Keep first text fully visible
      textQuad1.material.uniforms.uTransitionProgress.value = 1.0;
      
      if (textPhaseTime >= textStayTime) {
        textQuad2.material = textBaseMaterials[baseTextIndex + 1];
        textQuad2.material.uniforms.uTransitionProgress.value = 0.0; // Start invisible
        textQuad2.visible = true;
        
        textPhase = TextStates.FADE_IN_ODD;
        textPhaseTime = 0;
      }
    },
    
    // Phase 3: Odd-indexed text fades in while even-indexed text stays
    [TextStates.FADE_IN_ODD]: (delta) => {
      textPhaseTime += delta;
      const progress = Math.min(textPhaseTime / addNewTextTime, 1);
      
      // Keep first text fully visible
      textQuad1.visible = true;
      textQuad1.material.uniforms.uTransitionProgress.value = 1.0;
      
      // Fade in second text with easing
      const easedProgress = Math.sin(progress * Math.PI / 2);
      textQuad2.material.uniforms.uTransitionProgress.value = easedProgress;
      
      if (textPhaseTime >= addNewTextTime) {
        textPhase = TextStates.BOTH_STAY;
        textPhaseTime = 0;
      }
    },
    
    // Phase 4: Both texts stay visible
    [TextStates.BOTH_STAY]: (delta) => {
      textPhaseTime += delta;
      
      // Keep both texts fully visible
      textQuad1.material.uniforms.uTransitionProgress.value = 1.0;
      textQuad2.material.uniforms.uTransitionProgress.value = 1.0;
      
      if (textPhaseTime >= bothStayTime) {
        textPhase = TextStates.BOTH_OUT;
        textPhaseTime = 0;
      }
    },
    
    // Phase 5: Both texts fade out
    [TextStates.BOTH_OUT]: (delta) => {
      textPhaseTime += delta;
      const progress = Math.min(textPhaseTime / bothOutTime, 1);
      
      // Fade out both texts
      textQuad1.material.uniforms.uTransitionProgress.value = 1.0 - progress;
      if (textQuad2.visible) {
        textQuad2.material.uniforms.uTransitionProgress.value = 1.0 - progress;
      }
      
      if (textPhaseTime >= bothOutTime) {
        // Move to next pair of texts
        baseTextIndex += 2;
        
        // If we've gone past the available texts, wrap around
        if (baseTextIndex >= textBaseMaterials.length) {
          baseTextIndex = 0;
        }
        
        textPhase = TextStates.FADE_IN_EVEN;
        textPhaseTime = 0;
      }
    }
  };

  // Method to update the state machine
  const update = (delta) => {
    textPhaseHandlers[textPhase](delta);
  };
  
  // Method to get current state information  
  const getState = () => {
    return {
      baseTextIndex,
      textPhase,
      textPhaseTime,
      text1Progress: textQuad1.material.uniforms.uTransitionProgress.value,
      text2Progress: textQuad2.visible ? textQuad2.material.uniforms.uTransitionProgress.value : 0
    };
  };
  
  // Method to set state (used when resuming animation)
  const setState = (state) => {
    baseTextIndex = state.baseTextIndex;
    textPhase = state.textPhase;
    textPhaseTime = state.textPhaseTime;
    
    // Restore text quad states
    textQuad1.material = textBaseMaterials[baseTextIndex];
    textQuad1.material.uniforms.uTransitionProgress.value = state.text1Progress;
    textQuad1.visible = true;
    
    // Second quad might not be visible in all phases
    if (textPhase === TextStates.FADE_IN_ODD || 
        textPhase === TextStates.BOTH_STAY || 
        textPhase === TextStates.BOTH_OUT) {
      if (baseTextIndex + 1 < textBaseMaterials.length) {
        textQuad2.material = textBaseMaterials[baseTextIndex + 1];
        textQuad2.material.uniforms.uTransitionProgress.value = state.text2Progress;
        textQuad2.visible = true;
      }
    } else {
      textQuad2.visible = false;
    }
  };
  
  // Method to initialize the text quads
  const initialize = () => {
    baseTextIndex = 0;
    textPhase = TextStates.FADE_IN_EVEN;
    textPhaseTime = 0;
    
    // Initialize first text
    textQuad1.material = textBaseMaterials[0];
    textQuad1.material.uniforms.uTransitionProgress.value = 0.0;
    textQuad1.visible = true;
    
    // No second text at start
    textQuad2.visible = false;
  };
  
  // Method to check if the animation is complete
  const isComplete = (totalTexts) => {
    // Check if we're at the last pair of texts and finishing the fade out
    const lastEvenIndex = totalTexts - (totalTexts % 2 === 0 ? 2 : 1);
    return baseTextIndex === lastEvenIndex && 
           textPhase === TextStates.BOTH_OUT && 
           textPhaseTime >= bothOutTime;
  };
  
  // Return the public interface
  return {
    update,
    getState,
    setState,
    initialize,
    isComplete,
    get currentIndex() { return baseTextIndex; },
    get nextIndex() { return baseTextIndex + 1; },
    get phase() { return textPhase; },
    get timing() { 
      return { 
        textFadeInTime, 
        textStayTime, 
        addNewTextTime, 
        bothStayTime, 
        bothOutTime 
      }; 
    }
  };
}
