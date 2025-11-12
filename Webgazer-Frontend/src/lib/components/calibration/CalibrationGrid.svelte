<script lang="ts">
  import { CAL_POINTS } from '$lib/calibrationPoints';

  export let clicksPerPoint: number = 5;
  export let counts: number[];
  export let onPointClick: (index: number, event: MouseEvent) => void;

  $: allPointsDone = counts.every((c) => c >= clicksPerPoint);
</script>

<div class="relative h-[65vh] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
  {#each CAL_POINTS as [px, py], i}
    <button
      type="button"
      class="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-gray-900 bg-white grid place-items-center text-xs transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      style={`left:${px}%; top:${py}%; opacity:${0.2 * counts[i] + 0.2}; background-color:${counts[i] >= clicksPerPoint ? 'yellow' : 'white'}`}
      title={`Clicks: ${counts[i]} / ${clicksPerPoint}`}
      on:click|stopPropagation={(e) => onPointClick(i, e)}
      disabled={counts[i] >= clicksPerPoint}
      aria-label={`Calibration point ${i + 1}`}
    >
      <span class="text-gray-700">{counts[i]}</span>
    </button>
  {/each}
</div>

