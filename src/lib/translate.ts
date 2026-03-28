/**
 * Utilities for translating mod descriptions via the MyMemory API.
 *
 * translateChunk  – translates a single chunk of text while preserving
 *                   markdown/HTML syntax using PUA placeholder characters.
 * translateBody   – splits a full markdown body into paragraphs and translates
 *                   each one, leaving fenced code blocks untouched.
 */

const TRANSLATE_MAX = 500;
const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

export async function translateChunk(text: string, signal?: AbortSignal): Promise<string> {
  const preserved: string[] = [];
  // Generate a per-call random 8-hex-digit nonce so that the placeholder
  // is unique to this invocation and cannot collide with real content
  // even if the mod description happens to contain the MDPH prefix.
  // The nonce survives the MyMemory API round-trip because it consists
  // only of uppercase hex digits (A-F, 0-9) with no special characters.
  const nonce = Math.floor(Math.random() * 0x100000000).toString(16).toUpperCase().padStart(8, '0');
  const placeholder = (i: number) => `MDPH${nonce}${String(i).padStart(4, '0')}MDPH`;
  const protect = (match: string) => {
    const idx = preserved.length;
    preserved.push(match);
    return placeholder(idx);
  };

  let processed = text;
  processed = processed.replace(/<!--[\s\S]*?-->/g, protect);
  processed = processed.replace(/\[!?\[([^\]]*)\]\(([^)]*)\)\]\(([^)]*)\)/g, protect);
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, protect);
  processed = processed.replace(/\[([^\]]*)\]\(([^)]*)\)/g, protect);
  processed = processed.replace(/`[^`]+`/g, protect);
  processed = processed.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?\/?>/g, protect);
  processed = processed.replace(/&(?:[a-zA-Z]+|#\d+|#x[a-fA-F0-9]+);/g, protect);
  processed = processed.replace(/^#{1,6}\s/gm, protect);
  processed = processed.replace(/^(?:\s*>)+\s?/gm, protect);
  processed = processed.replace(/^\s*[-*+]\s/gm, protect);
  processed = processed.replace(/^\s*\d+\.\s/gm, protect);
  processed = processed.replace(/^[-*_]{3,}\s*$/gm, protect);
  processed = processed.replace(/\*\*|__/g, protect);
  processed = processed.replace(/_(?=\S)(.+?)(?<=\S)_/g, protect);
  processed = processed.replace(/~~/g, protect);
  processed = processed.replace(/https?:\/\/[^\s<>)\]]+/g, protect);

  try {
    const res = await fetch(`${TRANSLATE_API}?q=${encodeURIComponent(processed)}&langpair=en|ja`, { signal });
    if (!res.ok) return text;
    const data = await res.json();
    if (data.responseStatus === 200) {
      let result = data.responseData.translatedText as string;
      // Process in reverse order to avoid partial replacements.
      for (let i = preserved.length - 1; i >= 0; i--) {
        result = result.split(placeholder(i)).join(preserved[i]);
      }
      return result;
    }
  } catch (err) {
    // Re-throw AbortError so callers can detect cancellation.
    if ((err as { name?: string }).name === 'AbortError') throw err;
    // fall through for other errors (network, parse, etc.)
  }
  return text;
}

export async function translateBody(body: string, signal?: AbortSignal): Promise<string> {
  if (!body) return body;

  const codeBlocks: string[] = [];
  const CODE_PH = '\uE010';
  let processed = body.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm, (match) => {
    const idx = codeBlocks.length;
    codeBlocks.push(match);
    return `${CODE_PH}${idx}${CODE_PH}`;
  });

  const parts = processed.split(/(\n\n+)/);
  const translated = await Promise.all(
    parts.map(async (part) => {
      if (/^\s*$/.test(part)) return part;
      const trimmed = part.trim();
      if (!trimmed || trimmed.length < 3) return part;
      if (trimmed.includes(CODE_PH)) return part;
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~') || trimmed.startsWith('    ')) return part;
      if (trimmed.length <= TRANSLATE_MAX) return translateChunk(trimmed, signal);

      const chunks: string[] = [];
      let current = '';
      const sentences = trimmed.split(/(?<=\.)\s+(?=[A-Z])/);
      for (const sentence of sentences) {
        const candidate = current ? current + ' ' + sentence : sentence;
        if (candidate.length > TRANSLATE_MAX && current) {
          chunks.push(current);
          current = sentence;
        } else {
          current = candidate;
        }
      }
      if (current) chunks.push(current);
      const results = await Promise.all(chunks.map((c) => translateChunk(c, signal)));
      return results.join(' ');
    }),
  );

  let result = translated.join('');
  codeBlocks.forEach((block, i) => {
    result = result.split(`${CODE_PH}${i}${CODE_PH}`).join(block);
  });
  return result;
}
