/**
 * NFR-2 sync-latency probe: end-to-end peer mutation broadcast.
 *
 * Boots an in-memory sync server, joins two WS clients to one room, and
 * relays timestamped Yjs updates from A to B. Reports p50/p95 of
 * send-to-receive deltas (client A → server → client B).
 *
 * Run: `bun scripts/latency-probe.ts [--samples=100] [--budget-ms=50]`
 * from `packages/sync-server/`. Exit code is non-zero when p95 exceeds
 * the budget so nightly CI can gate on it. Not for per-PR CI (too flaky
 * on shared runners) — see `.github/workflows/ci.yml`.
 */
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import WebSocket from 'ws';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { createSyncServer } from '../src/index.js';
import { MemorySnapshotStore } from '../src/RoomLoader.js';

const WS_MESSAGE_SYNC = 0;
const WS_SYNC_UPDATE = 2;

function arg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  for (const token of process.argv.slice(2)) {
    if (token.startsWith(prefix)) {
      const value = Number(token.slice(prefix.length));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return fallback;
}

function open(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const rank = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[rank];
}

const samples = Math.floor(arg('samples', 100));
const budgetMs = arg('budget-ms', 50);

const app = createSyncServer(
  {
    port: 0,
    host: '127.0.0.1',
    nodeEnv: 'test',
    snapshotDebounceMs: 10_000,
    roomIdleTimeoutMs: 60_000,
    d2CommunityNodeLimit: 30,
    snapshotMaxPerRoom: 100,
    snapshotRetentionDays: 30,
    roomTicketTtlSec: 86400,
    userTokenTtlSec: 604800,
    r2MaxUploadBytes: 10_000_000,
    r2UrlExpiresInSec: 900,
  },
  new MemorySnapshotStore(),
);
await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
const address = app.server.address();
if (!address || typeof address === 'string') throw new Error('Server did not bind');

try {
  await app.manager.createRoom({ id: 'latency-probe', name: 'Latency probe' });
  const url = `ws://127.0.0.1:${address.port}/sync/latency-probe`;
  const clientA = await open(url);
  const clientB = await open(url);
  // Let initial sync step1/step2 chatter settle before measuring.
  await new Promise((resolve) => setTimeout(resolve, 300));

  const latencies: number[] = [];
  const docA = new Y.Doc();
  for (let i = 0; i < samples; i++) {
    const key = `probe-${i}`;
    const received = new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        clientB.off('message', onMessage);
        reject(new Error(`probe ${i} timed out`));
      }, 2000);
      const onMessage = (data: WebSocket.RawData, isBinary: boolean) => {
        if (!isBinary) return;
        const bytes = new Uint8Array(data as Buffer);
        try {
          const decoder = decoding.createDecoder(bytes);
          if (
            decoding.readVarUint(decoder) !== WS_MESSAGE_SYNC ||
            decoding.readVarUint(decoder) !== WS_SYNC_UPDATE
          )
            return;
        } catch {
          return;
        }
        clearTimeout(timer);
        clientB.off('message', onMessage);
        resolve(performance.now());
      };
      clientB.on('message', onMessage);
    });

    docA.getMap('canvas').set(key, { ts: Date.now() });
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, WS_MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(docA));
    const sentAt = performance.now();
    clientA.send(encoding.toUint8Array(encoder));
    const arrivedAt = await received;
    latencies.push(arrivedAt - sentAt);
    // Small gap so each probe is a distinct server relay, not a batch.
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  latencies.sort((a, b) => a - b);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const max = latencies[latencies.length - 1];
  console.log(
    `sync latency n=${samples}: p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms max=${max.toFixed(2)}ms (budget p95 < ${budgetMs}ms, NFR-2)`,
  );
  clientA.close();
  clientB.close();
  if (p95 > budgetMs) {
    console.error(`GATE FAIL: p95 ${p95.toFixed(2)}ms exceeds ${budgetMs}ms (NFR-2)`);
    process.exitCode = 1;
  }
} finally {
  await app.close();
}
