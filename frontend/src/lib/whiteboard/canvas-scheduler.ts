/**
 * Canvas Frame Rate Scheduler (PRD §3.1.4).
 *
 * Implements dirty-flag scheduling and adaptive throttling:
 * - Active state (< 2s since last user interaction): up to 60+ FPS unthrottled.
 * - Idle state (> 2s without interaction): throttles to 30 FPS (~33.3ms interval)
 *   and skips execution cycles when dirty flag is clean to conserve battery.
 */

export class CanvasScheduler {
  private lastActivityTime: number = performance.now();
  private lastRenderTime: number = -Infinity;
  private isDirtyFlag: boolean = true;
  private readonly idleThresholdMs: number = 2000;

  /**
   * Signal user activity (mouse move, click, zoom, key, or incoming sync delta)
   * to immediately restore full 60 FPS performance.
   */
  public markActive(): void {
    this.lastActivityTime = performance.now();
    this.isDirtyFlag = true;
  }

  /**
   * Mark canvas state as changed (e.g. elements mutated, camera moved).
   */
  public markDirty(): void {
    this.isDirtyFlag = true;
  }

  /**
   * Returns true if canvas has been idle for > 2 seconds.
   */
  public isIdle(now = performance.now()): boolean {
    return now - this.lastActivityTime > this.idleThresholdMs;
  }

  /**
   * Target frame interval in milliseconds:
   * ~16.6ms (60 FPS) when active; ~33.3ms (30 FPS) when idle.
   */
  public targetInterval(now = performance.now()): number {
    return this.isIdle(now) ? 33.33 : 16.67;
  }

  /**
   * Checks whether the current frame should render based on dirty state and interval.
   * If rendering should proceed, resets the dirty flag and returns true.
   */
  public shouldRender(now = performance.now()): boolean {
    if (!this.isDirtyFlag) {
      return false;
    }

    const interval = this.targetInterval(now);
    const elapsed = now - this.lastRenderTime;

    if (elapsed >= interval) {
      this.lastRenderTime = now;
      this.isDirtyFlag = false;
      return true;
    }

    return false;
  }
}
