import { describe, expect, test } from 'bun:test';
import { getNodePorts, nearestPort } from './geometry';

const RECT = { id: 'r1', x: 100, y: 100, width: 200, height: 100 };

describe('getNodePorts', () => {
  test('rectangles expose midpoints and corners', () => {
    const ids = getNodePorts(RECT).map((p) => p.id);
    expect(ids).toEqual(['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw']);
    const north = getNodePorts(RECT).find((p) => p.id === 'n');
    expect(north).toMatchObject({ x: 200, y: 100 });
  });

  test('diamonds and ellipses expose cardinals only', () => {
    expect(
      getNodePorts({ ...RECT, shape: 'diamond' }).map((p) => p.id),
    ).toEqual(['n', 'e', 's', 'w']);
    expect(
      getNodePorts({ ...RECT, shape: 'ellipse' }).map((p) => p.id),
    ).toEqual(['n', 'e', 's', 'w']);
  });

  test('line dividers expose their two ends', () => {
    const ports = getNodePorts({ ...RECT, shape: 'line' });
    expect(ports.map((p) => p.id)).toEqual(['w', 'e']);
  });

  test('ports rotate with the node', () => {
    const ports = getNodePorts({ ...RECT, rotation: 90 });
    const north = ports.find((p) => p.id === 'n');
    // A 90° clockwise turn moves the top midpoint to the right edge.
    expect(Math.round(north?.x ?? 0)).toBe(250);
    expect(Math.round(north?.y ?? 0)).toBe(150);
  });
});

describe('nearestPort', () => {
  test('snaps to the closest port within radius', () => {
    const hit = nearestPort({ x: 203, y: 104 }, [RECT]);
    expect(hit?.port.id).toBe('n');
    expect(hit?.node.id).toBe('r1');
  });

  test('misses beyond the radius and honors exclusions', () => {
    expect(nearestPort({ x: 400, y: 400 }, [RECT])).toBeNull();
    expect(nearestPort({ x: 203, y: 104 }, [RECT], 18, 'r1')).toBeNull();
  });
});
