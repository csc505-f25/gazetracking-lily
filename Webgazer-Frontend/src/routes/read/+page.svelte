<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { SAMPLE_TEXT } from '$lib/studyText';
  import { WebGazerManager } from '$lib/components';
  import { ReadingPanel } from '$lib/components/reading';

  let wgInstance: any = null;
  let started = false;
  let doneA = false;
  let doneB = false;
  let t0 = 0;
  let timeA = 0;
  let timeB = 0;

  // randomly assign which side is Serif vs Sans
  const fonts: { left: 'serif' | 'sans', right: 'serif' | 'sans' } = Math.random() < 0.5
    ? { left: 'serif', right: 'sans' }
    : { left: 'sans', right: 'serif' };

  function handleWebGazerInitialized(instance: any) {
    wgInstance = instance;
    // Hide video & overlays during reading
    instance.showVideo(false)
      .showFaceOverlay(false)
      .showFaceFeedbackBox(false)
      .showPredictionPoints(false);
  }

  function start() {
    if (started) return;
    started = true;
    t0 = performance.now();
  }

  function completeA() {
    if (!started || doneA) return;
    timeA = performance.now() - t0;
    doneA = true;
    // restart timer for B
    t0 = performance.now();
  }

  function completeB() {
    if (!started || doneB) return;
    timeB = performance.now() - t0;
    doneB = true;

    // stash results and continue to quiz
    sessionStorage.setItem('font_left', fonts.left);
    sessionStorage.setItem('font_right', fonts.right);
    sessionStorage.setItem('time_left_ms', String(fonts.left === 'serif' ? timeA : timeB));
    sessionStorage.setItem('time_right_ms', String(fonts.right === 'serif' ? timeB : timeA));
    // simpler explicit:
    sessionStorage.setItem('timeA_ms', String(timeA));
    sessionStorage.setItem('timeB_ms', String(timeB));
    goto('/quiz');
  }

</script>

<WebGazerManager
  showVideo={false}
  showFaceOverlay={false}
  showFaceFeedbackBox={false}
  showPredictionPoints={false}
  onInitialized={handleWebGazerInitialized}
/>

<div class="min-h-screen bg-white px-4 py-10">
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="text-center space-y-2">
      <h1 class="text-4xl font-light text-gray-900 tracking-tight">Font Comparison</h1>
      <p class="text-gray-500">Same text, two fonts. Read both boxes at a normal pace.</p>
    </div>

    <div class="flex items-center justify-center gap-3">
      <button
        class="px-5 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        on:click={start}
        disabled={started}
      >Start</button>
      {#if started}
        <span class="text-sm text-gray-500">Timer running…</span>
      {/if}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ReadingPanel
        label="Box A"
        fontType={fonts.left}
        text={SAMPLE_TEXT}
        done={doneA}
        onComplete={completeA}
        disabled={!started}
      />

      <ReadingPanel
        label="Box B"
        fontType={fonts.right}
        text={SAMPLE_TEXT}
        done={doneB}
        onComplete={completeB}
        disabled={!started || !doneA}
      />
    </div>

    <div class="text-sm text-gray-500">
      {#if doneA}<p>Box A time: {(timeA/1000).toFixed(2)}s</p>{/if}
      {#if doneB}<p>Box B time: {(timeB/1000).toFixed(2)}s</p>{/if}
    </div>
  </div>
</div>
