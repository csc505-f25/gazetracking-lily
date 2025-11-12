<script lang="ts">
  export let current: number;
  export let total: number;
  export let label: string = '';
</script>

<div class="w-full space-y-1">
  <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
    <div
      class="bg-gray-900 h-2 transition-all duration-300"
      style={`width:${total > 0 ? (100 * current / total).toFixed(1) : 0}%`}
    ></div>
  </div>
  {#if label}
    <p class="text-sm text-gray-500">{label}</p>
  {/if}
</div>

