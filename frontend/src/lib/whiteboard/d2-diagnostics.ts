/**
 * D2 compile-error diagnostics for inline Monaco markers.
 *
 * The Go compiler reports failures as human text (e.g. `D2 error: 3:12:
 * unexpected token …`), surfaced through `/api/compile` as `{ error, code,
 * details }`. The editor banner keeps showing the full message; this module
 * extracts `line:column` positions so the same failure also underlines the
 * offending range in the Monaco gutter.
 */

export type D2DiagnosticSeverity = 'error' | 'warning';

export type D2Diagnostic = {
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  column: number;
  message: string;
  severity: D2DiagnosticSeverity;
};

const MAX_DIAGNOSTICS = 20;

/** Matches `line:column` pairs (e.g. `3:12`, `line 3, column 12`). */
const LINE_COL_PATTERNS: RegExp[] = [
  /(\d+):(\d+)/,
  /line\s+(\d+)[,:\s]+col(?:umn)?\s*(\d+)/i,
];

/**
 * Parse compiler error text into Monaco-ready diagnostics. Returns `[]`
 * when no position can be recovered (banner-only failure) or when `code`
 * shows this is not a syntax failure (tier gating, validation, …).
 */
export function parseD2Diagnostics(
  message: string,
  code?: string,
): D2Diagnostic[] {
  if (!message || !message.trim()) return [];
  const isCompileFailure =
    code === undefined ||
    code === 'D2_COMPILE_FAILED' ||
    code === 'D2_COMPILER_UNAVAILABLE';
  if (!isCompileFailure) return [];
  const diagnostics: D2Diagnostic[] = [];
  // Scan each line separately so multi-error output yields one marker per
  // offending line instead of a single squiggle.
  for (const rawLine of message.split('\n')) {
    if (diagnostics.length >= MAX_DIAGNOSTICS) break;
    const line = rawLine.trim();
    if (!line) continue;
    for (const pattern of LINE_COL_PATTERNS) {
      // Fresh regex state per line (patterns are module-level, non-global,
      // so no lastIndex reset is needed — kept explicit for clarity).
      const match = pattern.exec(line);
      if (!match) continue;
      const parsedLine = Number(match[1]);
      const parsedColumn = Number(match[2]);
      if (
        Number.isInteger(parsedLine) &&
        Number.isInteger(parsedColumn) &&
        parsedLine >= 1 &&
        parsedLine <= 100000 &&
        parsedColumn >= 1 &&
        parsedColumn <= 100000
      ) {
        diagnostics.push({
          line: parsedLine,
          column: parsedColumn,
          message: line.slice(0, 300),
          severity: 'error',
        });
      }
      break;
    }
  }
  // No recoverable position. Only pin a line-1 marker for genuine
  // compiler syntax failures — tier/validation/network errors must not
  // squiggle the editor.
  if (diagnostics.length === 0 && code === 'D2_COMPILE_FAILED') {
    diagnostics.push({
      line: 1,
      column: 1,
      message: message.trim().slice(0, 300),
      severity: 'error',
    });
  }
  return diagnostics.slice(0, MAX_DIAGNOSTICS);
}
