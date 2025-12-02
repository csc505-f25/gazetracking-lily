<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { CAL_POINTS } from '$lib/calibrationPoints';

  export let clicksPerPoint: number = 5;
  export let counts: number[];
  export let onPointClick: (index: number, event: MouseEvent) => void;

  let containerElement: HTMLDivElement;
  let dotSize = 24; // Will be calculated based on screen size

  $: allPointsDone = counts.every((c) => c >= clicksPerPoint);

  function calculateDotSize() {
    if (!browser || !containerElement) return;
    
    requestAnimationFrame(() => {
      if (!containerElement) return;
      
      const containerWidth = containerElement.offsetWidth;
      const containerHeight = containerElement.offsetHeight;
      
      // Calculate dot size as 3-4% of the smaller dimension
      const baseSize = Math.min(containerWidth, containerHeight) * 0.035;
      // Clamp between 20px and 60px for good visibility and clickability
      dotSize = Math.max(20, Math.min(60, baseSize));
    });
  }

  $: if (browser && containerElement) {
    calculateDotSize();
  }

  let resizeTimeout: ReturnType<typeof setTimeout>;
  const handleResize = () => {
    if (!browser) return;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(calculateDotSize, 150);
  };

  onMount(() => {
    if (!browser) return;
    calculateDotSize();
    window.addEventListener('resize', handleResize);
  });

  onDestroy(() => {
    if (!browser) return;
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);
  });
</script>

<div 
  bind:this={containerElement}
  class="relative w-full h-full overflow-hidden"
>
  {#each CAL_POINTS as [px, py], i}
    <button
      type="button"
      class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-900 bg-white grid place-items-center transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:scale-110 active:scale-95 shadow-sm z-50"
      style={`
        left:${px}%; 
        top:${py}%; 
        width:${dotSize}px; 
        height:${dotSize}px; 
        opacity:${0.2 * counts[i] + 0.2}; 
        background-color:${counts[i] >= clicksPerPoint ? 'yellow' : 'white'};
        font-size:${Math.max(10, dotSize * 0.35)}px;
        z-index: 9999;
      `}
      title={`Clicks: ${counts[i]} / ${clicksPerPoint}`}
      on:click|stopPropagation={(e) => onPointClick(i, e)}
      disabled={counts[i] >= clicksPerPoint}
      aria-label={`Calibration point ${i + 1}`}
    >
      <span class="text-gray-700 font-medium">{counts[i]}</span>
    </button>
  {/each}
</div>

