<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { webgazerStore, type GazePoint } from '$lib/stores/webgazer';
  import { get } from 'svelte/store';

  export let duration: number = 5000; // milliseconds
  export let onComplete: (accuracy: number) => void;
  export let onError: (error: string) => void;

  // Export measuring state so parent can track it
  export let measuring = false;
  let sampleX: number[] = [];
  let sampleY: number[] = [];
  let gazeTrail: GazePoint[] = [];
  const TRAIL_LEN = 25;

  let unsubscribe: (() => void) | null = null;
  let checkInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    unsubscribe = webgazerStore.subscribe((state) => {
      if (state.currentGaze && measuring) {
        const gaze = state.currentGaze;
        gazeTrail.push(gaze);
        if (gazeTrail.length > TRAIL_LEN) gazeTrail.shift();

        sampleX.push(gaze.x);
        sampleY.push(gaze.y);
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
    if (checkInterval) clearInterval(checkInterval);
  });

  export async function startMeasurement(): Promise<void> {
    if (measuring) {
      console.warn('Measurement already in progress');
      return;
    }

    const state = get(webgazerStore);
    if (!state.instance || !state.isActive) {
      const errorMsg = 'WebGazer is not initialized or not active';
      console.error(errorMsg, state);
      onError?.(errorMsg);
      return;
    }

    console.log('Starting accuracy measurement...');
    measuring = true;
    gazeTrail = [];
    sampleX = [];
    sampleY = [];

    // Show prediction points during measurement
    try {
      state.instance.showPredictionPoints(true);
    } catch (error) {
      console.warn('Could not show prediction points:', error);
    }

    // Wait a moment for gaze data to start flowing
    await new Promise((r) => setTimeout(r, 500));

    // Wait for duration while collecting samples
    await new Promise((r) => setTimeout(r, duration));

    // Give a small buffer for any final samples
    await new Promise((r) => setTimeout(r, 200));

    // Compute accuracy
    const n = Math.min(sampleX.length, sampleY.length);
    console.log(`Collected ${n} gaze samples`);
    
    if (n === 0) {
      measuring = false;
      const errorMsg = 'No gaze samples captured. Make sure the webcam is allowed and your face is visible.';
      console.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const halfH = window.innerHeight / 2;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      const dx = cx - sampleX[i];
      const dy = cy - sampleY[i];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const p = dist <= halfH ? 100 - (dist / halfH) * 100 : 0;
      sum += p;
    }
    const accuracy = Math.round(sum / n);
    console.log(`Accuracy calculated: ${accuracy}% (from ${n} samples)`);

    measuring = false;
    onComplete?.(accuracy);
  }

  export function reset(): void {
    measuring = false;
    gazeTrail = [];
    sampleX = [];
    sampleY = [];
  }
</script>

<div class="relative w-full h-full">
  {#if measuring}
    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black" aria-hidden="true"></div>
    <div class="absolute left-1/2 -translate-x-1/2 bottom-3 bg-gray-900 text-white text-sm px-3 py-1 rounded-md shadow">
      Measuring accuracy… stare at the center dot for {(duration / 1000).toFixed(0)} seconds.
    </div>
  {/if}
</div>

