import { describe, expect, test } from 'bun:test';
import { CanvasScheduler } from './canvas-scheduler';

describe('CanvasScheduler', () => {
  test('starts active and dirty', () => {
    const scheduler = new CanvasScheduler();
    expect(scheduler.isIdle()).toBe(false);
    expect(scheduler.targetInterval()).toBe(16.67);
  });

  test('reports idle after 2000ms threshold', () => {
    const scheduler = new CanvasScheduler();
    const now = performance.now();
    expect(scheduler.isIdle(now + 1500)).toBe(false);
    expect(scheduler.isIdle(now + 2100)).toBe(true);
    expect(scheduler.targetInterval(now + 2100)).toBe(33.33);
  });

  test('skips render when dirty flag is false', () => {
    const scheduler = new CanvasScheduler();
    const now = performance.now();
    // First render should pass and reset dirty flag
    expect(scheduler.shouldRender(now)).toBe(true);
    // Next render without markDirty() should return false
    expect(scheduler.shouldRender(now + 100)).toBe(false);
  });

  test('markActive resets idle state', () => {
    const scheduler = new CanvasScheduler();
    scheduler.markActive();
    expect(scheduler.isIdle()).toBe(false);
  });
});
