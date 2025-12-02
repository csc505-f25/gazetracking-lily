<script lang="ts">
  import { getFontInfo, type FontName } from '$lib/fonts';

  interface Props {
    label: string;
    fontType?: 'serif' | 'sans'; // Legacy support
    fontName?: FontName; // New: specific font
    text: string;
    class?: string;
  }

  let { label, fontType, fontName, text, class: className = '' }: Props = $props();

  // Support both old (fontType) and new (fontName) props
  const fontInfo = $derived(fontName ? getFontInfo(fontName) : null);
  const displayName = $derived(fontInfo ? fontInfo.displayName : (fontType === 'serif' ? 'Serif' : 'Sans'));
  const fontFamily = $derived(fontInfo ? fontInfo.family : (fontType === 'serif' ? 'font-serif' : 'font-sans'));
  const isCustomFont = $derived(!!fontInfo);
</script>

<div class="border rounded-xl p-4 shadow-sm {className}">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-lg font-medium">{label} — {displayName}</h3>
  </div>
  <div 
    class="prose max-w-none leading-7 {isCustomFont ? '' : fontFamily}"
    style={isCustomFont ? `font-family: ${fontFamily};` : ''}
  >
    <p class="whitespace-pre-wrap">{text}</p>
  </div>
</div>

