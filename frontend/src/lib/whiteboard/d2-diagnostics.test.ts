import { describe, expect, test } from 'bun:test';
import { parseD2Diagnostics } from './d2-diagnostics';

describe('parseD2Diagnostics', () => {
  test('extracts line:col positions from compiler output', () => {
    const diagnostics = parseD2Diagnostics(
      'D2 error: 3:12: unexpected token',
      'D2_COMPILE_FAILED',
    );
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].line).toBe(3);
    expect(diagnostics[0].column).toBe(12);
  });

  test('yields one marker per offending line', () => {
    const diagnostics = parseD2Diagnostics(
      'D2 error: 2:5: bad shape\nD2 error: 7:1: unknown key',
      'D2_COMPILE_FAILED',
    );
    expect(diagnostics.map((d) => d.line)).toEqual([2, 7]);
  });

  test('stays banner-only for tier gating and validation', () => {
    expect(
      parseD2Diagnostics(
        "The 'elk' layout engine requires a Pro tier",
        'TIER_UPGRADE_REQUIRED',
      ),
    ).toEqual([]);
    expect(
      parseD2Diagnostics('Invalid request source Required', 'VALIDATION_ERROR'),
    ).toEqual([]);
  });

  test('never pins line 1 without a real syntax failure', () => {
    expect(parseD2Diagnostics('connection reset', undefined)).toEqual([]);
    expect(
      parseD2Diagnostics('AI provider answered 503', 'AI_PROVIDER_ERROR'),
    ).toEqual([]);
  });

  test('pins line 1 for position-less compiler diagnostics', () => {
    const diagnostics = parseD2Diagnostics(
      'D2 compilation failed',
      'D2_COMPILE_FAILED',
    );
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].line).toBe(1);
  });
});
