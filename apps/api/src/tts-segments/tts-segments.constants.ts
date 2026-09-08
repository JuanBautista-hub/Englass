export interface BilingualSegment {
  text: string;
  lang: 'en' | 'es';
}

const QUOTE_REGEX = /"([^"\n]+)"|'([^'\n]+)'|«([^«\n]+)»/g;
const TIP_PREFIX_RX = /^\s*💡\s*\*\s*/;

export function sanitizeForTts(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[«»]/g, '')
    .replace(/→/g, ' se convierte en ')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBilingual(text: string): BilingualSegment[] {
  const segments: BilingualSegment[] = [];
  let lastIndex = 0;
  const cleaned = text.replace(TIP_PREFIX_RX, '');
  for (const match of cleaned.matchAll(QUOTE_REGEX)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      const chunk = cleaned.slice(lastIndex, idx);
      if (chunk.trim().length > 0) {
        segments.push({ text: sanitizeForTts(chunk), lang: 'es' });
      }
    }
    const inner = match[1] ?? match[2] ?? match[3] ?? '';
    if (inner.trim().length > 0) {
      segments.push({ text: sanitizeForTts(inner), lang: 'en' });
    }
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < cleaned.length) {
    const chunk = cleaned.slice(lastIndex);
    if (chunk.trim().length > 0) {
      segments.push({ text: sanitizeForTts(chunk), lang: 'es' });
    }
  }
  if (segments.length === 0 && cleaned.trim().length > 0) {
    segments.push({ text: sanitizeForTts(cleaned), lang: 'es' });
  }
  return segments;
}