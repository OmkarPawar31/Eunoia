'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { BoardArrow, BoardStroke } from '@/lib/whiteboard/board-types';
import { arrowPath, inkOutlinePath, smoothPath } from '@/lib/whiteboard/paths';

type ElementPointerHandler = (
  event: ReactPointerEvent<SVGGElement | SVGCircleElement>,
  elementId: string,
) => void;

type EndpointHandler = (
  event: ReactPointerEvent<SVGCircleElement>,
  arrowId: string,
  endpoint: 'start' | 'end',
) => void;

/**
 * Freehand stroke group (extracted from WhiteboardPage so the canvas can
 * paint nodes/arrows/strokes in one global z-order).
 */
export function StrokeElement({
  stroke,
  selected,
  interactiveCursor,
  onPointerDown,
}: {
  stroke: BoardStroke;
  selected: boolean;
  interactiveCursor: boolean;
  onPointerDown: ElementPointerHandler;
}) {
  // Pressure ink renders as a filled variable-width outline; legacy
  // centerline strokes keep the uniform look.
  const inkD = inkOutlinePath(stroke);
  const isOutline = inkD.endsWith('Z');
  return (
    <g
      className={`stroke-group ${selected ? 'is-selected' : ''}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event, stroke.id);
      }}
    >
      <path
        d={isOutline ? inkD : smoothPath(stroke.points)}
        fill={isOutline ? 'transparent' : 'none'}
        stroke="transparent"
        strokeWidth="18"
        style={{ cursor: interactiveCursor ? 'pointer' : 'default' }}
      />
      {isOutline ? (
        <path
          d={inkD}
          fill={stroke.color}
          fillOpacity={stroke.opacity ?? 1}
          stroke="none"
        />
      ) : (
        <path
          d={smoothPath(stroke.points)}
          fill="none"
          stroke={stroke.color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {selected && (
        <path
          d={isOutline ? inkD : smoothPath(stroke.points)}
          fill="none"
          stroke="#6965db"
          strokeWidth={isOutline ? 2 : 6}
          strokeDasharray="4 4"
          opacity="0.7"
        />
      )}
    </g>
  );
}

/**
 * Connector arrow group with endpoint handles when selected (extracted
 * from WhiteboardPage for unified z-order painting).
 */
export function ArrowElement({
  arrow,
  selected,
  markerId,
  interactiveCursor,
  onPointerDown,
  onEndpointPointerDown,
}: {
  arrow: BoardArrow;
  selected: boolean;
  markerId: string;
  interactiveCursor: boolean;
  onPointerDown: ElementPointerHandler;
  onEndpointPointerDown: EndpointHandler;
}) {
  const routedD = arrowPath(arrow);
  return (
    <g
      className={`arrow-group ${selected ? 'is-selected' : ''}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event, arrow.id);
      }}
    >
      <path
        d={routedD}
        fill="none"
        stroke="transparent"
        strokeWidth="18"
        style={{ cursor: interactiveCursor ? 'pointer' : 'default' }}
      />
      <path
        d={routedD}
        fill="none"
        stroke={arrow.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={`url(#${markerId})`}
      />
      {selected && (
        <>
          <path
            d={routedD}
            fill="none"
            stroke="#6965db"
            strokeWidth="5"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <circle
            cx={arrow.start.x}
            cy={arrow.start.y}
            r="6"
            fill="#ffffff"
            stroke="#6965db"
            strokeWidth="2.5"
            style={{ cursor: 'move' }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onEndpointPointerDown(event, arrow.id, 'start');
            }}
          />
          <circle
            cx={arrow.end.x}
            cy={arrow.end.y}
            r="6"
            fill="#ffffff"
            stroke="#6965db"
            strokeWidth="2.5"
            style={{ cursor: 'move' }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onEndpointPointerDown(event, arrow.id, 'end');
            }}
          />
        </>
      )}
    </g>
  );
}
