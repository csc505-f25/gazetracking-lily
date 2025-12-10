<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { get } from 'svelte/store';
  import { webgazerStore, endWebGazer } from '$lib/stores/webgazer';
  let name = '';

  // Hide WebGazer overlay and video on home page
  onMount(() => {
    // Hide any existing WebGazer UI elements
    const hideWebGazerUI = () => {
      // Hide video element
      const video = document.querySelector('video');
      if (video) {
        video.style.display = 'none';
      }
      
      // Hide face overlay
      const faceOverlay = document.querySelector('.webgazerFaceFeedbackBox');
      if (faceOverlay) {
        (faceOverlay as HTMLElement).style.display = 'none';
      }
      
      // Hide prediction points
      const predictionPoints = document.querySelectorAll('.webgazerGazeDot');
      predictionPoints.forEach((dot) => {
        (dot as HTMLElement).style.display = 'none';
      });
    };

    // Hide immediately
    hideWebGazerUI();

    // Also check if WebGazer is active and hide its UI
    const storeState = get(webgazerStore);
    if (storeState.instance && storeState.isActive) {
      try {
        if (storeState.instance.showVideo) {
          storeState.instance.showVideo(false);
        }
        if (storeState.instance.showFaceOverlay) {
          storeState.instance.showFaceOverlay(false);
        }
        if (storeState.instance.showFaceFeedbackBox) {
          storeState.instance.showFaceFeedbackBox(false);
        }
        if (storeState.instance.showPredictionPoints) {
          storeState.instance.showPredictionPoints(false);
        }
      } catch (error) {
        console.warn('Error hiding WebGazer UI:', error);
      }
    }

    // Periodically hide in case WebGazer recreates elements
    const interval = setInterval(hideWebGazerUI, 500);

    return () => {
      clearInterval(interval);
    };
  });

  function start() {
    // Clear any previous study session data to allow retaking
    // Note: participant_id is kept so the same participant can retake
    sessionStorage.removeItem('current_passage_index');
    sessionStorage.removeItem('current_passage_id');
    sessionStorage.removeItem('current_screen');
    sessionStorage.removeItem('total_passages');
    sessionStorage.removeItem('study_text_id');
    sessionStorage.removeItem('session_db_id');
    sessionStorage.removeItem('session_id');
    sessionStorage.removeItem('calibration_points');
    sessionStorage.removeItem('font_left');
    sessionStorage.removeItem('font_right');
    sessionStorage.removeItem('time_left_ms');
    sessionStorage.removeItem('time_right_ms');
    sessionStorage.removeItem('timeA_ms');
    sessionStorage.removeItem('timeB_ms');
    sessionStorage.removeItem('font_preference');
    sessionStorage.removeItem('font_preferred_type');
    // Clear tournament data
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('match_') || key.startsWith('tournament_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // not used in the flow yet, but persisted for later if needed
    localStorage.setItem('participant_name', name.trim());
    goto('/setup');
  }
</script>

<div class="min-h-screen bg-white flex items-center justify-center px-4">
  <div class="max-w-xl w-full space-y-8 text-center">
    <div class="space-y-4">
      <h1 class="text-5xl font-light text-gray-900 tracking-tight">Readability Study</h1>
    </div>

    <!-- <div class="space-y-3">
      <input
        id="name-input"
        class="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:border-gray-900"
        bind:value={name}
        placeholder="Type your name"
      />
    </div> -->

    <div class="flex items-center justify-center gap-4">
      <button
        class="px-8 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors shadow-sm"
        on:click={start}
      >
        Start Setup
      </button>
    </div>
  </div>
</div>

<style>
  /* Hide all WebGazer UI elements on home page */
  :global(video) {
    display: none !important;
  }

  :global(.webgazerFaceFeedbackBox) {
    display: none !important;
  }

  :global(.webgazerGazeDot) {
    display: none !important;
  }

  :global(.webgazerVideoFeed) {
    display: none !important;
  }
</style>
