'use client';

import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { BoardNode } from '@/lib/whiteboard/board-types';
import { normalizeRotation } from '@/lib/whiteboard/geometry';

type CanvasNodeProps = {
  node: BoardNode;
  selected: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGGElement>) => void;
  onDoubleClick: () => void;
  onKeySelect: (
    event: ReactKeyboardEvent<SVGGElement>,
    node: BoardNode,
  ) => void;
  onImageError?: (node: BoardNode) => void;
};

/**
 * Single canvas node (extracted from WhiteboardPage for velocity).
 * Supports `round` (default), `cylinder`, `note`, `ellipse`, `text`,
 * `image`, `diamond` (decision), and `line` (divider) shapes.
 */
export function CanvasNode({
  node,
  selected,
  onPointerDown,
  onDoubleClick,
  onKeySelect,
  onImageError,
}: CanvasNodeProps) {
  const isNote = node.shape === 'note';
  const isCylinder = node.shape === 'cylinder';
  const isEllipse = node.shape === 'ellipse';
  const isText = node.shape === 'text';
  const isImage = node.shape === 'image';
  const isDiamond = node.shape === 'diamond';
  const isLine = node.shape === 'line';
  const shapeStyle = {
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
    strokeDasharray: node.dashed ? '7 5' : undefined,
    opacity: node.opacity ?? 1,
  };

  const rotation = normalizeRotation(node.rotation ?? 0);
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  const diamondPoints = isDiamond
    ? `${centerX},${node.y} ${node.x + node.width},${centerY} ${centerX},${node.y + node.height} ${node.x},${centerY}`
    : null;

  return (
    <g
      className={`canvas-node canvas-node--${node.tone} ${isNote ? 'is-note' : ''} ${selected ? 'is-selected' : ''}`}
      transform={
        rotation === 0 ? undefined : `rotate(${rotation} ${centerX} ${centerY})`
      }
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick();
      }}
      role="button"
      tabIndex={0}
      aria-label={`Select ${node.label}`}
      aria-pressed={selected}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onKeySelect(event, node);
        }
      }}
    >
      {isImage ? (
        <>
          <image
            className="node-image"
            href={node.href}
            crossOrigin="anonymous"
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            preserveAspectRatio="none"
            style={{ opacity: node.opacity ?? 1 }}
            onError={() => onImageError?.(node)}
          />
          <rect
            className="node-image-frame"
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx="12"
            style={{ opacity: node.opacity ?? 1 }}
          />
        </>
      ) : isLine ? (
        <>
          {/* Wide invisible hit area so thin dividers stay selectable. */}
          <rect
            className="node-line-hit"
            x={node.x}
            y={centerY - 12}
            width={node.width}
            height={24}
            fill="transparent"
          />
          <line
            className="node-line"
            x1={node.x}
            y1={centerY}
            x2={node.x + node.width}
            y2={centerY}
            style={shapeStyle}
            strokeLinecap="round"
          />
        </>
      ) : isNote ? (
        <path
          className="node-note"
          d={`M ${node.x + 10} ${node.y} h ${node.width - 22} l 12 12 v ${node.height - 24} q 0 12 -12 12 h -${node.width - 10} q -10 0 -10 -10 v -${node.height - 4} q 0 -10 10 -10`}
          style={shapeStyle}
        />
      ) : isCylinder ? (
        <>
          <path
            className="node-body"
            d={`M ${node.x} ${node.y + 16} v ${node.height - 32} c 0 11 ${((node.width / 2) * 0.4526).toFixed(1)} 20 ${(node.width / 2).toFixed(1)} 20 s ${(node.width / 2).toFixed(1)} -9 ${(node.width / 2).toFixed(1)} -20 V ${node.y + 16}`}
            style={shapeStyle}
          />
          <ellipse
            className="node-cap"
            cx={node.x + node.width / 2}
            cy={node.y + 16}
            rx={node.width / 2}
            ry="20"
            style={shapeStyle}
          />
          <path
            className="node-rim"
            d={`M ${node.x} ${node.y + 16} c 0 11 ${((node.width / 2) * 0.4526).toFixed(1)} 20 ${(node.width / 2).toFixed(1)} 20 s ${(node.width / 2).toFixed(1)} -9 ${(node.width / 2).toFixed(1)} -20`}
            style={{ stroke: node.stroke, strokeWidth: node.strokeWidth }}
          />
        </>
      ) : isEllipse ? (
        <ellipse
          className="node-body"
          cx={node.x + node.width / 2}
          cy={node.y + node.height / 2}
          rx={node.width / 2}
          ry={node.height / 2}
          style={shapeStyle}
        />
      ) : isDiamond && diamondPoints ? (
        <polygon className="node-body" points={diamondPoints} style={shapeStyle} />
      ) : isText ? null : (
        <rect
          className="node-body"
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx="18"
          style={shapeStyle}
        />
      )}
      {!isImage && !isLine && (
        <text
          className={`node-label ${isText ? 'node-label--text' : ''}`}
          x={node.x + (isText ? 0 : 18)}
          y={
            node.y +
            (isText ? Math.round(node.height * 0.72) : isNote ? 42 : 43)
          }
          style={{
            fontSize: isText
              ? `${node.fontSize ?? Math.max(14, Math.round(node.height * 0.65))}px`
              : undefined,
          }}
        >
          {node.label}
        </text>
      )}
      {!isText && !isImage && !isLine && (
        <text
          className="node-detail"
          x={node.x + 18}
          y={node.y + (isNote ? 70 : 68)}
        >
          {node.detail}
        </text>
      )}
    </g>
  );
}
