import { describe, expect, test } from 'bun:test';
import { wrapSvgText } from './text-wrap';

describe('wrapSvgText', () => {
  test('returns empty array for empty string', () => {
    expect(wrapSvgText('', 100, 16)).toEqual([]);
  });

  test('keeps single short line intact', () => {
    const lines = wrapSvgText('Hello world', 200, 16);
    expect(lines).toEqual(['Hello world']);
  });

  test('wraps long sentence at word boundaries', () => {
    // Width of 100 with 16px font and 0.55 charWidthFactor gives ~11 chars per line
    const text = 'The quick brown fox jumps over the lazy dog';
    const lines = wrapSvgText(text, 100, 16);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(text);
  });

  test('respects explicit newlines', () => {
    const text = 'Line 1\nLine 2\n\nLine 4';
    const lines = wrapSvgText(text, 500, 16);
    expect(lines).toEqual(['Line 1', 'Line 2', '', 'Line 4']);
  });

  test('splits long unbroken word across lines', () => {
    const text = 'Supercalifragilisticexpialidocious';
    const lines = wrapSvgText(text, 80, 16);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe(text);
  });

  test('honors maxLines option', () => {
    const text = 'One\nTwo\nThree\nFour\nFive';
    const lines = wrapSvgText(text, 500, 16, { maxLines: 3 });
    expect(lines).toEqual(['One', 'Two', 'Three']);
  });
});
