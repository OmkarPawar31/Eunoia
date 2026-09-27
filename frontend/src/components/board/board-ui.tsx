'use client';

import type { ReactNode } from 'react';

/** Sidebar tool button (extracted from WhiteboardPage). */
export function ToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`board-tool ${active ? 'is-active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Floating toolbar tool button (extracted from WhiteboardPage). */
export function FloatingToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={`floating-tool ${active ? 'is-active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const second =
    parts.length > 1 ? (parts[1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return `${first}${second}`.toUpperCase();
}

export function PresenceAvatar({
  initials,
  color,
  title,
}: {
  initials: string;
  color: string;
  title?: string;
}) {
  return (
    <span
      className="presence-avatar"
      style={{ backgroundColor: color }}
      aria-hidden={title ? undefined : true}
      title={title}
    >
      {initials}
    </span>
  );
}

export function Connector({
  path,
  label,
  labelX,
  labelY,
  dashed = false,
}: {
  path: string;
  label: string;
  labelX: number;
  labelY: number;
  dashed?: boolean;
}) {
  return (
    <g className={`board-connector ${dashed ? 'is-dashed' : ''}`}>
      <path d={path} markerEnd="url(#arrowhead)" />
      <rect x={labelX - 44} y={labelY - 13} width="88" height="26" rx="13" />
      <text x={labelX} y={labelY + 4} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
