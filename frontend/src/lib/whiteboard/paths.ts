import type { BoardArrow, BoardStroke } from './board-types';
import type { Point } from './geometry';

/**
 * Path builders for canvas rendering (extracted from WhiteboardPage).
 * Pure functions with no React dependencies.
 */

export function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1)
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }
  d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return d;
}

/**
 * Central path router for user arrows. `straight` is the legacy `M…L`
 * segment; `orthogonal` emits axis-aligned `H/V` elbows via the segment
 * midpoint; `curved` emits a cubic with control points offset
 * perpendicular to the chord for a gentle arc.
 */
export function arrowPath(arrow: BoardArrow): string {
  const { start, end } = arrow;
  const routing = arrow.routing ?? 'straight';
  if (routing === 'orthogonal') {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    // Elbow orientation follows the dominant axis so short connectors
    // don't zig-zag: mostly-horizontal chords bend vertically and vice versa.
    if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
      return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    }
    return `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`;
  }
  if (routing === 'curved') {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular bow, scaled by chord length and capped for stability.
    const bow = Math.min(60, len * 0.18);
    const nx = -dy / len;
    const ny = dx / len;
    const c1x = start.x + dx * 0.3 + nx * bow;
    const c1y = start.y + dy * 0.3 + ny * bow;
    const c2x = start.x + dx * 0.7 + nx * bow;
    const c2y = start.y + dy * 0.7 + ny * bow;
    return `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
  }
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/**
 * Variable-width ink outline for a freehand stroke. Uses the brush size
 * and per-point pressure to build a tapered polygon; falls back to the
 * legacy uniform centerline smoothing when no pressure data exists so old
 * boards render identically.
 */
export function inkOutlinePath(stroke: BoardStroke): string {
  const points = stroke.points;
  if (points.length === 0) return '';
  const brushSize = stroke.brushSize ?? 6;
  const hasPressure = points.some(
    (p) => typeof p.pressure === 'number' && Number.isFinite(p.pressure),
  );
  if (!hasPressure) return smoothPath(points);
  const halfWidths = points.map((p) => {
    const pressure =
      typeof p.pressure === 'number' && Number.isFinite(p.pressure)
        ? Math.min(1, Math.max(0, p.pressure))
        : 0.5;
    // Taper: light touches draw thin, full pressure draws the full brush.
    return (brushSize * (0.25 + 0.75 * pressure)) / 2;
  });
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.0001) {
      dx = 0;
      dy = 1;
    } else {
      dx /= len;
      dy /= len;
    }
    const nx = -dy;
    const ny = dx;
    const hw = halfWidths[i];
    left.push(`${points[i].x + nx * hw} ${points[i].y + ny * hw}`);
    right.push(`${points[i].x - nx * hw} ${points[i].y - ny * hw}`);
  }
  if (left.length === 1) {
    // Single dot: render a small filled blob instead of a degenerate line.
    const [cx, cy] = left[0].split(' ').map(Number);
    const r = halfWidths[0];
    return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  return `M ${left.join(' L ')} L ${right.reverse().join(' L ')} Z`;
}
