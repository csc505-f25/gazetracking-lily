<script lang="ts">
  import { webgazerStore, type GazePoint } from '$lib/stores/webgazer';
  import { onMount, onDestroy } from 'svelte';

  export let showTrail: boolean = false;
  export let trailLength: number = 25;

  let currentGaze: GazePoint | null = null;
  let hasGaze = false;
  let gazeTrail: GazePoint[] = [];

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    unsubscribe = webgazerStore.subscribe((state) => {
      currentGaze = state.currentGaze;
      hasGaze = state.hasGaze;

      if (showTrail && currentGaze) {
        gazeTrail.push(currentGaze);
        if (gazeTrail.length > trailLength) {
          gazeTrail.shift();
        }
      }
    });
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
</script>

{#if showTrail && hasGaze && currentGaze}
  <!-- Live blue gaze trail overlay -->
  {#each gazeTrail as p, idx (idx)}
    <div
      class="fixed w-2.5 h-2.5 rounded-full pointer-events-none z-50"
      style={`left:${p.x - 5}px; top:${p.y - 5}px; background: rgba(37, 99, 235, 0.8);`}
      aria-hidden="true"
    ></div>
  {/each}
  <!-- current gaze dot slightly larger -->
  <div
    class="fixed w-3.5 h-3.5 rounded-full ring-2 ring-white pointer-events-none z-50"
    style={`left:${currentGaze.x - 7}px; top:${currentGaze.y - 7}px; background: rgba(37, 99, 235, 1);`}
    aria-label="Current gaze"
  ></div>
{/if}

