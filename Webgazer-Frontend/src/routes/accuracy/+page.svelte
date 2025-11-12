<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { webgazerStore } from '$lib/stores/webgazer';
  import { get } from 'svelte/store';
  import { WebGazerManager } from '$lib/components';
  import { AccuracyMeasurer, GazeOverlay } from '$lib/components/accuracy';

  const ACCURACY_THRESHOLD = 70;

  let finished = false;
  let accuracy = 0;
  let accuracyMeasurer: AccuracyMeasurer | null = null;
  let wgInstance: any = null;
  let measuring = false;
  let webGazerReady = false;

  $: canContinue = finished && accuracy >= ACCURACY_THRESHOLD;

  // Check if WebGazer is already initialized from store
  onMount(() => {
    const storeState = get(webgazerStore);
    if (storeState.instance && storeState.isActive) {
      wgInstance = storeState.instance;
      webGazerReady = true;
      console.log('Using existing WebGazer instance from store');
      // Start measurement after components are ready
      setTimeout(() => {
        startMeasurementIfReady();
      }, 1500);
    }
  });

  function startMeasurementIfReady() {
    if (accuracyMeasurer && webGazerReady) {
      console.log('Starting accuracy measurement...');
      accuracyMeasurer.startMeasurement().catch((error) => {
        console.error('Error starting measurement:', error);
        handleAccuracyError(error.message || 'Failed to start measurement');
      });
    } else {
      console.warn('Not ready yet - measurer:', !!accuracyMeasurer, 'webGazer:', webGazerReady);
    }
  }

  function handleWebGazerInitialized(instance: any) {
    wgInstance = instance;
    webGazerReady = true;
    console.log('WebGazer initialized on accuracy page', instance);
    
    // Wait a bit longer to ensure gaze data is flowing
    setTimeout(() => {
      startMeasurementIfReady();
    }, 1000);
  }

  function handleWebGazerError(error: string) {
    alert(error);
  }

  function handleAccuracyComplete(acc: number) {
    console.log('Accuracy measurement complete:', acc);
    accuracy = acc;
    finished = true;
    measuring = false;

    if (accuracy < ACCURACY_THRESHOLD) {
      const shouldRecalibrate = confirm(
        `Accuracy is ${accuracy}% (< ${ACCURACY_THRESHOLD}%). Would you like to recalibrate?`
      );
      if (shouldRecalibrate) {
        goto('/calibrate');
      }
    } else {
      // Hide video & overlays now that accuracy check is complete
      if (wgInstance) {
        try {
          wgInstance.showVideo(false)
            .showFaceOverlay(false)
            .showFaceFeedbackBox(false)
            .showPredictionPoints(false);
        } catch (error) {
          console.warn('Error hiding overlays:', error);
        }
      }
    }
  }

  function handleAccuracyError(error: string) {
    alert(error);
    measuring = false;
  }

  function handleRetry() {
    accuracy = 0;
    finished = false;
    measuring = false;
    if (accuracyMeasurer) {
      accuracyMeasurer.reset();
      setTimeout(() => {
        if (accuracyMeasurer) {
          accuracyMeasurer.startMeasurement().catch((error) => {
            console.error('Error retrying measurement:', error);
            handleAccuracyError(error.message || 'Failed to retry measurement');
          });
        }
      }, 300);
    }
  }

  async function finish() {
    if (!wgInstance) return;
    await wgInstance.end();
    goto('/read');
  }
</script>

<WebGazerManager
  showVideo={true}
  showFaceOverlay={true}
  showFaceFeedbackBox={true}
  showPredictionPoints={true}
  onInitialized={handleWebGazerInitialized}
  onError={handleWebGazerError}
/>

<div class="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-10">
  <div class="w-full max-w-3xl space-y-6 text-center">
    <div class="space-y-2">
      <h1 class="text-4xl font-light text-gray-900 tracking-tight">Accuracy Check</h1>
      <p class="text-gray-600 font-light">
        We'll measure the accuracy of your eye tracking calibration.
      </p>
    </div>

    <div class="relative h-[65vh] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
      <AccuracyMeasurer
        bind:this={accuracyMeasurer}
        bind:measuring
        duration={5000}
        onComplete={handleAccuracyComplete}
        onError={handleAccuracyError}
      />
    </div>

    <div class="space-y-2">
      {#if finished}
        <p class="text-gray-800">
          Accuracy: <span class="font-medium">{accuracy}%</span>
          {#if accuracy < ACCURACY_THRESHOLD}
            <span class="text-red-600"> (below {ACCURACY_THRESHOLD}%)</span>
          {/if}
        </p>
      {/if}

      <div class="flex items-center justify-center gap-3">
        {#if finished && accuracy < ACCURACY_THRESHOLD}
          <button
            on:click={() => goto('/calibrate')}
            class="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Recalibrate
          </button>
        {/if}
        {#if finished}
          <button
            on:click={handleRetry}
            class="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Retry Measurement
          </button>
        {/if}
        <button
          on:click={finish}
          disabled={!canContinue}
          class="px-6 py-2 rounded-lg text-white shadow-sm transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed
                 bg-gray-900 hover:bg-gray-800"
        >
          Continue
        </button>
      </div>

      {#if !canContinue && finished}
        <p class="text-xs text-gray-500">
          You can continue once accuracy is at least {ACCURACY_THRESHOLD}%, or recalibrate to improve.
        </p>
      {/if}
    </div>
  </div>
</div>

<GazeOverlay showTrail={measuring} trailLength={25} />

