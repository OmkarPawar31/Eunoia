/**
 * SVG Text Wrapping Utility.
 *
 * Breaks text into multiple lines for SVG <tspan> rendering based on
 * available width, font size, and explicit newlines (\n).
 */

export type WrapOptions = {
  /** Approximate average character width as a multiple of fontSize (default: 0.55). */
  charWidthFactor?: number;
  /** Maximum number of lines to return before clipping (default: 50). */
  maxLines?: number;
};

/**
 * Splits `text` into wrapped lines that fit within `maxWidth`.
 * Honors explicit newlines (`\n`), word boundaries, and breaks very long
 * unbroken words if they exceed `maxWidth`.
 */
export function wrapSvgText(
  text: string,
  maxWidth: number,
  fontSize: number,
  options: WrapOptions = {},
): string[] {
  if (!text) return [];
  if (maxWidth <= 0 || fontSize <= 0) return [text];

  const charWidth = fontSize * (options.charWidthFactor ?? 0.55);
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
  const maxLines = options.maxLines ?? 50;

  // Split on manual line breaks first
  const rawParagraphs = text.split('\n');
  const resultLines: string[] = [];

  for (const paragraph of rawParagraphs) {
    if (resultLines.length >= maxLines) break;

    // Preserve blank lines
    if (!paragraph.trim()) {
      resultLines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      if (resultLines.length >= maxLines) break;

      // If the single word itself is wider than maxWidth, break it into chunks
      if (word.length > maxCharsPerLine) {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = '';
        }
        let remainingWord = word;
        while (remainingWord.length > maxCharsPerLine) {
          resultLines.push(remainingWord.slice(0, maxCharsPerLine));
          remainingWord = remainingWord.slice(maxCharsPerLine);
          if (resultLines.length >= maxLines) break;
        }
        if (remainingWord && resultLines.length < maxLines) {
          currentLine = remainingWord;
        }
        continue;
      }

      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= maxCharsPerLine) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine && resultLines.length < maxLines) {
      resultLines.push(currentLine);
    }
  }

  return resultLines.length > 0 ? resultLines : [''];
}
