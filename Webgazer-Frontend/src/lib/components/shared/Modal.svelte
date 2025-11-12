<script lang="ts">
  export let open: boolean = false;
  export let title: string = '';
  export let message: string = '';
  export let buttonText: string = 'OK';
  export let onClose: (() => void) | null = null;
  export let secondaryButtonText: string | null = null;
  export let onSecondaryClick: (() => void) | null = null;

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
    class="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="button"
    tabindex="0"
    aria-label="Close modal"
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
        <p class="text-gray-700 text-left leading-relaxed">
          {message}
        </p>
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
        <button
          on:click={handleClose}
          class="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors border border-blue-600"
        >
          {buttonText}
        </button>
      </div>
    </div>
  </div>
{/if}

