<script lang="ts">
  interface Props {
    label: string;
    fontType: 'serif' | 'sans';
    text: string;
    class?: string;
  }

  let { label, fontType, text, class: className = '' }: Props = $props();

  function fontClass(kind: 'serif' | 'sans') {
    return kind === 'serif' ? 'font-serif' : 'font-sans';
  }
</script>

<div class="border rounded-xl p-4 shadow-sm {className}">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-lg font-medium">{label} — {fontType === 'serif' ? 'Serif' : 'Sans'}</h3>
  </div>
  <div class={`prose max-w-none leading-7 ${fontClass(fontType)}`}>
    <p class="whitespace-pre-wrap">{text}</p>
  </div>
</div>

