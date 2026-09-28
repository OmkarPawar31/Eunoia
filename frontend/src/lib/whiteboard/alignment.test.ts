import { describe, expect, test } from 'bun:test';
import { alignNodes, distributeNodes, type AlignableNode } from './geometry';

describe('alignNodes', () => {
  const nodes: AlignableNode[] = [
    { id: '1', x: 10, y: 20, width: 100, height: 50 },
    { id: '2', x: 200, y: 150, width: 80, height: 40 },
    { id: '3', x: 80, y: 80, width: 60, height: 60 },
  ];

  test('aligns left to minX', () => {
    const aligned = alignNodes(nodes, 'left');
    expect(aligned.map((n) => n.x)).toEqual([10, 10, 10]);
  });

  test('aligns right to maxX - width', () => {
    // max right edge is 200 + 80 = 280
    const aligned = alignNodes(nodes, 'right');
    expect(aligned.find((n) => n.id === '1')?.x).toBe(180); // 280 - 100
    expect(aligned.find((n) => n.id === '2')?.x).toBe(200); // 280 - 80
    expect(aligned.find((n) => n.id === '3')?.x).toBe(220); // 280 - 60
  });

  test('aligns top to minY', () => {
    const aligned = alignNodes(nodes, 'top');
    expect(aligned.map((n) => n.y)).toEqual([20, 20, 20]);
  });

  test('aligns bottom to maxY - height', () => {
    // max bottom is 150 + 40 = 190
    const aligned = alignNodes(nodes, 'bottom');
    expect(aligned.find((n) => n.id === '1')?.y).toBe(140); // 190 - 50
    expect(aligned.find((n) => n.id === '2')?.y).toBe(150); // 190 - 40
    expect(aligned.find((n) => n.id === '3')?.y).toBe(130); // 190 - 60
  });

  test('returns single node or empty array unchanged', () => {
    expect(alignNodes([], 'left')).toEqual([]);
    expect(alignNodes([nodes[0]], 'left')).toEqual([nodes[0]]);
  });
});

describe('distributeNodes', () => {
  test('distributes 3 nodes evenly along horizontal axis', () => {
    const nodes: AlignableNode[] = [
      { id: '1', x: 0, y: 0, width: 100, height: 50 },
      { id: '2', x: 50, y: 0, width: 100, height: 50 },
      { id: '3', x: 500, y: 0, width: 100, height: 50 },
    ];
    // Span: 0 to 600 = 600 total width.
    // Total node width = 300.
    // Total gap = 300. 2 gaps -> 150 per gap.
    // Node 1: x = 0
    // Node 2: x = 0 + 100 + 150 = 250
    // Node 3: x = 250 + 100 + 150 = 500
    const distributed = distributeNodes(nodes, 'horizontal');
    expect(distributed.find((n) => n.id === '1')?.x).toBe(0);
    expect(distributed.find((n) => n.id === '2')?.x).toBe(250);
    expect(distributed.find((n) => n.id === '3')?.x).toBe(500);
  });

  test('returns less than 3 nodes unchanged', () => {
    const nodes: AlignableNode[] = [
      { id: '1', x: 0, y: 0, width: 100, height: 50 },
      { id: '2', x: 50, y: 0, width: 100, height: 50 },
    ];
    expect(distributeNodes(nodes, 'horizontal')).toEqual(nodes);
  });
});
