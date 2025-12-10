<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { WebGazerManager, Modal } from '$lib/components';
  import { get } from 'svelte/store';
  import { webgazerStore } from '$lib/stores/webgazer';

  let showInstructionModal = true;
  let webGazerReady = false;
  let wgInstance: any = null;

  const instructionMessage = `Before we begin, please ensure you have proper setup:

• Find a well-lit area with good lighting on your face
• Position yourself so your face is clearly visible
• Sit at a comfortable distance from your screen
• Keep your head steady and centered

Once you close this modal, we'll show a face overlay to help you position yourself correctly.`;

  function closeInstructionModal() {
    showInstructionModal = false;
  }

  function handleWebGazerInitialized(instance: any) {
    wgInstance = instance;
    webGazerReady = true;
    console.log('WebGazer initialized for setup', instance);
    
    // Also get from store as backup
    const storeState = get(webgazerStore);
    if (storeState.instance && !wgInstance) {
      wgInstance = storeState.instance;
    }

    // Style the face overlay to be centered and large
    setTimeout(() => {
      styleFaceOverlay();
    }, 500);
  }

  function handleWebGazerError(error: string) {
    alert(error);
  }

  function styleFaceOverlay() {
    // Find and style the WebGazer face overlay canvas (the one with dots)
    // WebGazer creates canvas elements for the face overlay - style all canvas elements
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      // Skip the video feed canvas if it exists
      if (canvas.id !== 'webgazerVideoFeedCanvas' && !canvas.classList.contains('webgazerVideoFeed')) {
        // This is likely the face overlay canvas with dots
        canvas.style.setProperty('position', 'fixed', 'important');
        canvas.style.setProperty('top', '50%', 'important');
        canvas.style.setProperty('left', '50%', 'important');
        canvas.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        canvas.style.setProperty('width', '600px', 'important');
        canvas.style.setProperty('height', '600px', 'important');
        canvas.style.setProperty('z-index', '40', 'important');
      }
    });

    // Find and style the WebGazer face feedback box (the box that appears in top left)
    const overlay = document.querySelector('.webgazerFaceFeedbackBox') as HTMLElement;
    if (overlay) {
      overlay.style.setProperty('position', 'fixed', 'important');
      overlay.style.setProperty('top', '50%', 'important');
      overlay.style.setProperty('left', '50%', 'important');
      overlay.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      overlay.style.setProperty('width', '600px', 'important');
      overlay.style.setProperty('height', '600px', 'important');
      overlay.style.setProperty('z-index', '40', 'important');
      overlay.style.setProperty('border', '3px solid #3b82f6', 'important');
      overlay.style.setProperty('border-radius', '8px', 'important');
      overlay.style.setProperty('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 'important');
    }

    // Also style the video element if it exists (make it larger and centered)
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.style.setProperty('position', 'fixed', 'important');
      video.style.setProperty('top', '50%', 'important');
      video.style.setProperty('left', '50%', 'important');
      video.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
      video.style.setProperty('width', '600px', 'important');
      video.style.setProperty('height', '600px', 'important');
      video.style.setProperty('object-fit', 'cover', 'important');
      video.style.setProperty('border-radius', '8px', 'important');
      video.style.setProperty('z-index', '30', 'important');
    }
  }

  function handleReadyToStart() {
    goto('/calibrate');
  }

  onMount(() => {
    // Re-style overlay periodically in case WebGazer recreates it
    const interval = setInterval(() => {
      if (webGazerReady) {
        styleFaceOverlay();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  });
</script>

<WebGazerManager
  showVideo={true}
  showFaceOverlay={true}
  showFaceFeedbackBox={false}
  showPredictionPoints={false}
  onInitialized={handleWebGazerInitialized}
  onError={handleWebGazerError}
/>

<Modal
  open={showInstructionModal}
  title="Setup Instructions"
  message={instructionMessage}
  buttonText="Got it"
  onClose={closeInstructionModal}
/>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
  <!-- Instructions text at top -->
  <div class="text-center space-y-4 mb-4 z-10 absolute top-20">
    <h1 class="text-4xl font-light text-gray-900 tracking-tight">Position Your Face</h1>
    <p class="text-gray-600 max-w-md">
      Make sure your face is centered in the overlay. Keep your head steady and look straight ahead.
    </p>
  </div>

  <!-- Face overlay will be positioned in the center by WebGazer and styled via CSS -->
  <!-- The overlay is positioned at 50% top/left via CSS, so we don't need a container here -->

  <!-- Ready to Start button below the overlay -->
  <div class="absolute bottom-32 z-10">
    <button
      class="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      on:click={handleReadyToStart}
      disabled={!webGazerReady}
    >
      {webGazerReady ? 'Ready to Start' : 'Initializing...'}
    </button>
  </div>
</div>

<style>
  /* Global styles for WebGazer overlay elements */
  /* Style canvas elements (face overlay with dots) - exclude video feed canvas */
  :global(canvas:not(#webgazerVideoFeedCanvas)) {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 600px !important;
    height: 600px !important;
    z-index: 40 !important;
  }


  :global(video) {
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 600px !important;
    height: 600px !important;
    object-fit: cover !important;
    border-radius: 8px !important;
    z-index: 30 !important;
  }
</style>

