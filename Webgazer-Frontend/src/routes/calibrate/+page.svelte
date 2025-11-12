<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { CAL_POINTS } from '$lib/calibrationPoints';
  import { webgazerStore } from '$lib/stores/webgazer';
  import { get } from 'svelte/store';
  import { WebGazerManager } from '$lib/components';
  import { CalibrationGrid, ProgressBar } from '$lib/components/calibration';

  const CLICKS_PER_POINT = 5;
  const ACCURACY_THRESHOLD = 70;

  let counts = Array(CAL_POINTS.length).fill(0);
  let wgInstance: any = null;
  let webGazerReady = false;

  $: totalClicks = counts.reduce((a, b) => a + b, 0);
  $: clickGoal = CLICKS_PER_POINT * CAL_POINTS.length;
  $: allPointsDone = counts.every((c) => c >= CLICKS_PER_POINT);

  function handlePointClick(i: number, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!wgInstance || !webGazerReady) {
      console.warn('WebGazer instance not initialized yet. Please wait...');
      alert('WebGazer is still initializing. Please wait a moment and try again.');
      return;
    }

    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    
    try {
      // Record the calibration point
      wgInstance.recordScreenPosition(cx, cy, 'click');
      console.log(`Calibration point ${i + 1} recorded: (${cx}, ${cy})`);
    } catch (error) {
      console.error('Error recording calibration point:', error);
      alert('Error recording calibration point. Please try again.');
      return;
    }

    // Update counts
    if (counts[i] < CLICKS_PER_POINT) {
      counts[i] += 1;
      counts = [...counts]; // trigger reactivity
      console.log(`Point ${i + 1}: ${counts[i]}/${CLICKS_PER_POINT} clicks`);
    }

    // Check if all points are done (check directly, not using reactive statement)
    const allDone = counts.every((c) => c >= CLICKS_PER_POINT);
    
    if (allDone) {
      console.log('All calibration points completed!');
      // Small delay to ensure UI updates before navigation
      setTimeout(() => {
        goto('/accuracy');
      }, 500);
    }
  }

  function handleWebGazerInitialized(instance: any) {
    wgInstance = instance;
    webGazerReady = true;
    console.log('WebGazer initialized and ready for calibration', instance);
    
    // Also get from store as backup
    const storeState = get(webgazerStore);
    if (storeState.instance && !wgInstance) {
      wgInstance = storeState.instance;
    }
  }

  function handleWebGazerError(error: string) {
    alert(error);
  }

  function reset() {
    if (wgInstance) {
      try {
        wgInstance.clearData?.();
        console.log('Calibration data cleared');
      } catch (error) {
        console.error('Error clearing calibration data:', error);
      }
    }
    counts = Array(CAL_POINTS.length).fill(0);
    counts = [...counts]; // trigger reactivity
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
      <h1 class="text-4xl font-light text-gray-900 tracking-tight">Calibration</h1>
      <p class="text-gray-600 font-light">
        Click each dot <span class="font-medium">{CLICKS_PER_POINT}</span> times. Keep your head steady.
      </p>
    </div>

    <ProgressBar current={totalClicks} total={clickGoal} label="{totalClicks} / {clickGoal} clicks" />

    {#if !webGazerReady}
      <div class="text-center py-8">
        <p class="text-gray-500">Initializing WebGazer... Please wait.</p>
      </div>
    {/if}
    
    <CalibrationGrid
      clicksPerPoint={CLICKS_PER_POINT}
      counts={counts}
      onPointClick={handlePointClick}
    />

    <div class="space-y-2">
      <div class="flex items-center justify-center gap-3">
        <button
          on:click={reset}
          class="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Clear calibration
        </button>
        {#if allPointsDone}
          <p class="text-sm text-gray-600">Calibration complete! Proceeding to accuracy check...</p>
        {/if}
      </div>
    </div>
  </div>
</div>
