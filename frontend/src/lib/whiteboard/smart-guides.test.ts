import { describe, expect, test } from 'bun:test';
import { computeSmartSnap } from './smart-guides';

describe('computeSmartSnap', () => {
  const candidate = {
    id: 'c1',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
  };

  test('snaps left edge to left edge when within threshold', () => {
    // Drag box at x: 103 (diff = 3 <= 6 threshold)
    const dragAabb = {
      minX: 103,
      minY: 300,
      maxX: 203,
      maxY: 400,
    };
    const result = computeSmartSnap(dragAabb, [candidate], 6);
    expect(result.snappedX).toBe(100);
    expect(result.guides.length).toBe(1);
    expect(result.guides[0].orientation).toBe('vertical');
    expect(result.guides[0].x1).toBe(100);
  });

  test('snaps center to center', () => {
    // Candidate center: 100 + 100 = 200
    // Drag box width 100, at x: 148 -> center is 198 (diff = 2 <= 6)
    const dragAabb = {
      minX: 148,
      minY: 300,
      maxX: 248,
      maxY: 400,
    };
    const result = computeSmartSnap(dragAabb, [candidate], 6);
    expect(result.snappedX).toBe(150); // center becomes 200
    expect(result.guides.some((g) => g.orientation === 'vertical')).toBe(true);
  });

  test('does not snap when distance exceeds threshold', () => {
    const dragAabb = {
      minX: 115, // diff = 15 > 6
      minY: 300,
      maxX: 215,
      maxY: 400,
    };
    const result = computeSmartSnap(dragAabb, [candidate], 6);
    expect(result.snappedX).toBe(115);
    expect(result.guides.length).toBe(0);
  });
});
