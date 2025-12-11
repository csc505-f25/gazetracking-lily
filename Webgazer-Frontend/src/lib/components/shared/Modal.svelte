<script lang="ts">
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  
  export let open: boolean = false;
  export let title: string = '';
  export let message: string = '';
  export let buttonText: string | null = 'OK';
  export let onClose: (() => void) | null = null;
  export let secondaryButtonText: string | null = null;
  export let onSecondaryClick: (() => void) | null = null;

  // Hide body content when modal is open
  $: if (open) {
    if (typeof document !== 'undefined') {
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    }
  } else {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  }

  onDestroy(() => {
    // Clean up on component destroy
    if (typeof document !== 'undefined') {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  });

  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  function handleSecondaryClick() {
    if (onSecondaryClick) {
      onSecondaryClick();
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    // Close when clicking the backdrop
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Close on Escape, Enter, or Space key
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClose();
    }
  }

  function handleModalKeydown(e: KeyboardEvent) {
    // Stop keyboard events from propagating to backdrop
    e.stopPropagation();
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="modal-backdrop fixed inset-0 bg-gray-100 z-[9999] flex items-center justify-center p-4"
    on:click={onClose ? handleBackdropClick : undefined}
    on:keydown={onClose ? handleKeydown : undefined}
    role="dialog"
    tabindex={onClose ? 0 : undefined}
    aria-label={onClose ? "Close modal" : "Loading"}
    style="pointer-events: auto; visibility: visible !important; opacity: 1 !important; z-index: 9999 !important;"
  >
    <!-- Modal -->
    <div
      class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
      on:click|stopPropagation
      on:keydown={handleModalKeydown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      tabindex="0"
    >
      <!-- Title -->
      {#if title}
        <h2 id="modal-title" class="text-2xl font-bold text-gray-900 text-center">
          {title}
        </h2>
      {/if}

      <!-- Message -->
      {#if message}
        <div class="text-gray-700 text-left leading-relaxed whitespace-pre-line space-y-1">
          {message}
        </div>
      {/if}

      <!-- Buttons -->
      <div class="flex justify-end gap-3 pt-2">
        {#if secondaryButtonText}
          <button
            on:click={handleSecondaryClick}
            class="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md shadow-sm transition-colors border border-gray-300"
          >
            {secondaryButtonText}
          </button>
        {/if}
        {#if buttonText}
          <button
            on:click={handleClose}
            class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors border border-blue-600"
          >
            {buttonText}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Prevent body scroll when modal is open */
  :global(body.modal-open) {
    overflow: hidden !important;
  }

  /* Ensure modal backdrop is always visible and on top */
  :global(.modal-backdrop) {
    visibility: visible !important;
    pointer-events: auto !important;
    opacity: 1 !important;
    z-index: 9999 !important;
    position: fixed !important;
  }

  /* Ensure modal content inside backdrop is visible */
  :global(.modal-backdrop > *) {
    visibility: visible !important;
    pointer-events: auto !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 10000 !important;
  }
</style>

