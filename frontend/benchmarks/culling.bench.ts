/**
 * Culling benchmark: rbush-backed SpatialIndex rebuild + viewport search.
 *
 * Run with: `bun run bench` (or `bun benchmarks/culling.bench.ts`) from `frontend/`.
 *
 * CI gate (PRD §5.1, NFR-1: 60 FPS pan/zoom at 3,000+ shapes): at N=3000,
 * p50-ish search must stay under ~2ms and rebuild under ~8ms. Breaches set
 * a non-zero exit code so CI fails.
 */

import { SpatialIndex } from '../src/lib/whiteboard/spatial-index';
import type { Aabb } from '../src/lib/whiteboard/geometry';

type Entry = Aabb & { id: string };

const SEARCH_BUDGET_MS = 2;
const REBUILD_BUDGET_MS = 8;
const GATE_SIZE = 3000;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateCorpus(size: number, seed: number): Entry[] {
  const rand = mulberry32(seed);
  const entries: Entry[] = [];
  for (let i = 0; i < size; i++) {
    // Mix: 70% clustered (diagram-like groups), 30% uniform scatter.
    const clustered = rand() < 0.7;
    const cx = clustered
      ? Math.floor(rand() * 8) * 600 + rand() * 400
      : rand() * 12000;
    const cy = clustered
      ? Math.floor(rand() * 6) * 500 + rand() * 350
      : rand() * 8000;
    const w = 40 + rand() * 260;
    const h = 30 + rand() * 160;
    const x = cx - w / 2;
    const y = cy - h / 2;
    entries.push({ id: `n-${i}`, minX: x, minY: y, maxX: x + w, maxY: y + h });
  }
  return entries;
}

const VIEWPORTS: Array<{ name: string; bounds: Aabb }> = [
  {
    name: 'close-up',
    bounds: { minX: 500, minY: 400, maxX: 1700, maxY: 1100 },
  },
  {
    name: 'wide (zoomed out)',
    bounds: { minX: -2000, minY: -2000, maxX: 14000, maxY: 10000 },
  },
];

function intersects(a: Aabb, b: Aabb): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

function bench(
  name: string,
  iterations: number,
  fn: () => number,
): { name: string; avgMs: number; hits: number } {
  // Warmup.
  for (let i = 0; i < Math.min(5, iterations); i++) fn();
  let hits = 0;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) hits += fn();
  const total = performance.now() - start;
  return { name, avgMs: total / iterations, hits };
}

function runCorpus(size: number): { rebuildMs: number; searchMs: number } {
  const corpus = generateCorpus(size, 42);
  console.log(`\n=== corpus N=${size} ===`);

  const index = new SpatialIndex<Entry>();
  const rebuild = bench('rebuild', 10, () => {
    index.rebuild(corpus.map((e) => ({ ...e, value: e })));
    return 0;
  });
  index.rebuild(corpus.map((e) => ({ ...e, value: e })));

  console.log(`  build: rebuild=${rebuild.avgMs.toFixed(2)}ms`);

  let worstSearch = 0;
  for (const viewport of VIEWPORTS) {
    // Correctness: index counts must agree with brute force.
    const indexCount = index.search(viewport.bounds).length;
    let bruteCount = 0;
    for (const e of corpus) if (intersects(e, viewport.bounds)) bruteCount++;
    if (indexCount !== bruteCount) {
      console.error(
        `  MISMATCH ${viewport.name}: index=${indexCount} brute=${bruteCount}`,
      );
      process.exitCode = 1;
    }
    const search = bench(`search ${viewport.name}`, 50, () => {
      return index.search(viewport.bounds).length;
    });
    const brute = bench(`brute-force ${viewport.name}`, 10, () => {
      let count = 0;
      for (const e of corpus) if (intersects(e, viewport.bounds)) count++;
      return count;
    });
    worstSearch = Math.max(worstSearch, search.avgMs);
    console.log(
      `  search ${viewport.name}: index=${search.avgMs.toFixed(3)}ms brute=${brute.avgMs.toFixed(3)}ms (${indexCount} visible)`,
    );
  }
  return { rebuildMs: rebuild.avgMs, searchMs: worstSearch };
}

let failed = false;
for (const size of [500, 3000, 5000, 10000]) {
  const { rebuildMs, searchMs } = runCorpus(size);
  if (size === GATE_SIZE) {
    if (searchMs > SEARCH_BUDGET_MS) {
      console.error(
        `GATE FAIL at N=${size}: search ${searchMs.toFixed(3)}ms exceeds ${SEARCH_BUDGET_MS}ms (NFR-1)`,
      );
      failed = true;
    }
    if (rebuildMs > REBUILD_BUDGET_MS) {
      console.error(
        `GATE FAIL at N=${size}: rebuild ${rebuildMs.toFixed(2)}ms exceeds ${REBUILD_BUDGET_MS}ms (NFR-1)`,
      );
      failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
console.log('\ndone.');
