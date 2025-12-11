<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { initializeWebGazer, endWebGazer, updateGaze, type GazePoint } from '$lib/stores/webgazer';

  export let showVideo: boolean = true;
  export let showFaceOverlay: boolean = true;
  export let showFaceFeedbackBox: boolean = true;
  export let showPredictionPoints: boolean = true;
  export let onInitialized: ((instance: any) => void) | null = null;
  export let onError: ((error: string) => void) | null = null;

  let initialized = false;

  onMount(async () => {
    // Check if already initialized to avoid reinitialization
    const { get } = await import('svelte/store');
    const { webgazerStore } = await import('$lib/stores/webgazer');
    const currentState = get(webgazerStore);
    
    if (currentState.instance && currentState.isActive) {
      console.log('WebGazer already active, reusing instance');
      const instance = currentState.instance;
      
      // CRITICAL: Ensure video is enabled if requested
      // The camera stream should already be active, we just need to show/hide the video element
      try {
        if (showVideo && instance.showVideo) {
          // Call showVideo multiple times to ensure it takes effect
          instance.showVideo(true);
          // Retry after a short delay in case video element isn't ready yet
          setTimeout(() => {
            if (instance.showVideo) {
              instance.showVideo(true);
            }
          }, 200);
        } else if (instance.showVideo) {
          instance.showVideo(false);
        }
        if (instance.showFaceOverlay) instance.showFaceOverlay(showFaceOverlay);
        if (instance.showFaceFeedbackBox) instance.showFaceFeedbackBox(showFaceFeedbackBox);
        if (instance.showPredictionPoints) instance.showPredictionPoints(showPredictionPoints);
      } catch (error) {
        console.warn('Error updating WebGazer display settings:', error);
      }
      
      // Always set up gaze listener to update the store
      if (instance.setGazeListener) {
        instance.setGazeListener((data: { x: number; y: number } | null) => {
          if (data) {
            updateGaze({ x: data.x, y: data.y });
          } else {
            updateGaze(null);
          }
        });
      }
      
      initialized = true;
      onInitialized?.(instance);
      return;
    }

    try {
      const instance = await initializeWebGazer({
        showVideo,
        showFaceOverlay,
        showFaceFeedbackBox,
        showPredictionPoints,
        onGaze: (gaze: GazePoint | null) => {
          updateGaze(gaze);
        }
      });
      initialized = true;
      onInitialized?.(instance);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize WebGazer';
      console.error('WebGazer initialization error:', error);
      onError?.(errorMessage);
      if (onError === null) {
        alert(errorMessage);
      }
    }
  });

  onDestroy(async () => {
    // Only end WebGazer if this component actually initialized it
    // Don't end if we're just reusing an existing instance
    if (initialized) {
      // Check if other components might still be using WebGazer
      const { get } = await import('svelte/store');
      const { webgazerStore } = await import('$lib/stores/webgazer');
      const currentState = get(webgazerStore);
      
      // Only end if this was the last component using it
      // For now, we'll let WebGazer persist across page navigations
      // Uncomment the line below if you want to end WebGazer on component destroy
      // await endWebGazer();
    }
  });
</script>

