/**
 * D2 compile-pipeline benchmark: parse + reconcile for a 50-node diagram.
 *
 * Run with: `bun run bench` (or `bun benchmarks/compile.bench.ts`) from `frontend/`.
 *
 * CI gate (NFR-3: compile + reconciliation + render under 500ms for a
 * 50-node diagram): parse + reconcile must stay far below that budget.
 * Breaches set a non-zero exit code so CI fails.
 */

import {
  parseCompileResponse,
  reconcileDiagram,
} from '../src/lib/whiteboard/d2-adapter';
import type { BoardNode } from '../src/lib/whiteboard/board-types';

const NODE_COUNT = 50;
const BUDGET_MS = 500;

function buildPayload(nodeCount: number) {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    key: `n${i}`,
    label: `node ${i}`,
    x: (i % 10) * 220,
    y: Math.floor(i / 10) * 160,
    width: 180,
    height: 90,
    shape: 'rectangle',
    style: { fill: '#ffffff', stroke: '#5b54c7' },
    strokeWidth: 2,
  }));
  const edges = Array.from({ length: nodeCount - 1 }, (_, i) => ({
    key: `n${i}->n${i + 1}`,
    source: `n${i}`,
    target: `n${i + 1}`,
    label: '',
    color: '#6b7192',
  }));
  return { nodes, edges, engine: 'dagre' };
}

const anchorOf = (node: BoardNode, _target: { x: number; y: number }) => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
});
const centerOf = (node: BoardNode) => ({
  x: node.x + node.width / 2,
  y: node.y + node.height / 2,
});

function benchParse(iterations: number, payload: unknown): number {
  for (let i = 0; i < 5; i++) parseCompileResponse(payload);
  const start = performance.now();
  for (let i = 0; i < iterations; i++) parseCompileResponse(payload);
  return (performance.now() - start) / iterations;
}

function benchReconcile(
  iterations: number,
  payload: ReturnType<typeof buildPayload>,
): number {
  const diagram = parseCompileResponse(payload);
  if (!diagram) throw new Error('bench payload failed to parse');
  for (let i = 0; i < 5; i++)
    reconcileDiagram([], [], diagram, anchorOf, centerOf);
  const start = performance.now();
  for (let i = 0; i < iterations; i++)
    reconcileDiagram([], [], diagram, anchorOf, centerOf);
  return (performance.now() - start) / iterations;
}

const payload = buildPayload(NODE_COUNT);
const parseMs = benchParse(50, payload);
const reconcileMs = benchReconcile(50, payload);
const totalMs = parseMs + reconcileMs;

console.log(
  `compile pipeline N=${NODE_COUNT}: parse=${parseMs.toFixed(3)}ms reconcile=${reconcileMs.toFixed(3)}ms total=${totalMs.toFixed(3)}ms (budget ${BUDGET_MS}ms)`,
);

if (totalMs > BUDGET_MS) {
  console.error(
    `GATE FAIL: parse+reconcile ${totalMs.toFixed(1)}ms exceeds ${BUDGET_MS}ms (NFR-3)`,
  );
  process.exitCode = 1;
} else {
  console.log('done.');
}
