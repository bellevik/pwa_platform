import { useEffect, useMemo, useRef, useState } from 'react';
import { ASSEMBLER_CYCLE_MS, DIRECTION_MARKERS, DIRECTION_VECTORS, ITEM_COLORS, MACHINE_DEFINITIONS } from '../game/machines';
import { ASSEMBLER_RECIPES, ITEM_SHORT_LABELS } from '../game/recipes';
import type { Direction, FactoryFloor, ToolKind } from '../game/types';

type FactoryBoardProps = {
  floor: FactoryFloor;
  selectedTool: ToolKind;
  placementDirection: Direction;
  selectedMachineId: string | null;
  onInteract: (x: number, y: number) => void;
  onDragPath: (cells: Array<{ x: number; y: number }>) => void;
};

type CameraState = {
  zoom: number;
  panX: number;
  panY: number;
};

type PointerState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
  mode: 'pending' | 'pan' | 'drag-build';
  cells: Array<{ x: number; y: number }>;
};

type PinchState = {
  startDistance: number;
  startZoom: number;
  anchorWorldX: number;
  anchorWorldY: number;
};

const MIN_ZOOM = 0.85;
const MAX_ZOOM = 2.5;
const BOARD_PADDING = 44;
const PAN_THRESHOLD = 8;
const TOP_CONTENT_GUTTER = 112;
const BOTTOM_CONTENT_GUTTER = 20;

export function FactoryBoard({ floor, selectedTool, placementDirection, selectedMachineId, onInteract, onDragPath }: FactoryBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 320, height: 540 });
  const [dragCells, setDragCells] = useState<Array<{ x: number; y: number }>>([]);
  const [camera, setCamera] = useState<CameraState>({ zoom: 1.28, panX: 0, panY: 0 });
  const [renderTick, setRenderTick] = useState(0);
  const pointerStateRef = useRef<PointerState | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStateRef = useRef<PinchState | null>(null);

  const hoveredLabel = useMemo(() => (
    selectedTool === 'erase'
      ? 'Erase'
      : `${MACHINE_DEFINITIONS[selectedTool].label} ${DIRECTION_MARKERS[placementDirection]}`
  ), [placementDirection, selectedTool]);

  const geometry = useMemo(() => {
    return computeGeometry(canvasSize.width, canvasSize.height, floor.width, floor.height, camera.zoom);
  }, [camera.zoom, canvasSize.height, canvasSize.width, floor.height, floor.width]);

  useEffect(() => {
    const element = wrapperRef.current;

    if (!element) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setCanvasSize({
        width: element.clientWidth,
        height: element.clientHeight
      });
    });

    observer.observe(element);
    setCanvasSize({ width: element.clientWidth, height: element.clientHeight });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCamera((current) => clampCamera(current, geometry));
  }, [geometry.boardHeight, geometry.boardWidth, geometry.height, geometry.width]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRenderTick((value) => (value + 1) % 1000);
    }, 90);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const { width, height, tileSize, boardWidth, boardHeight, baseX, baseY } = geometry;
    const originX = baseX + camera.panX;
    const originY = baseY + camera.panY;

    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#08131b';
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(width * 0.5, height * 0.42, 80, width * 0.5, height * 0.42, Math.max(width, height));
    glow.addColorStop(0, 'rgba(15, 118, 110, 0.08)');
    glow.addColorStop(1, 'rgba(8, 19, 27, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#232b35';
    context.strokeStyle = '#58606d';
    context.lineWidth = 2;
    context.fillRect(originX, originY, boardWidth, boardHeight);
    context.strokeRect(originX, originY, boardWidth, boardHeight);

    drawHazardBorder(context, originX, originY, boardWidth, boardHeight);

    for (let y = 0; y < floor.height; y += 1) {
      for (let x = 0; x < floor.width; x += 1) {
        const left = originX + x * tileSize;
        const top = originY + y * tileSize;
        context.fillStyle = (x + y) % 2 === 0 ? '#2b323d' : '#262d37';
        context.fillRect(left + 1, top + 1, tileSize - 2, tileSize - 2);
        context.strokeStyle = '#38414d';
        context.lineWidth = 1;
        context.strokeRect(left, top, tileSize, tileSize);
        drawTileBolts(context, left, top, tileSize);
      }
    }

    if (dragCells.length > 0) {
      context.fillStyle = selectedTool === 'erase' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(14, 165, 233, 0.2)';

      for (const cell of dragCells) {
        const left = originX + cell.x * tileSize;
        const top = originY + cell.y * tileSize;
        context.fillRect(left + 2, top + 2, tileSize - 4, tileSize - 4);
        context.strokeStyle = selectedTool === 'erase' ? '#ef4444' : '#38bdf8';
        context.lineWidth = 2;
        context.strokeRect(left + 3, top + 3, tileSize - 6, tileSize - 6);
      }
    }

    for (const machine of floor.machines) {
      const left = originX + machine.x * tileSize;
      const top = originY + machine.y * tileSize;
      const def = MACHINE_DEFINITIONS[machine.kind];
      const isBeltLike = machine.kind === 'belt' || machine.kind === 'splitter';

      context.fillStyle = isBeltLike ? '#8c939b' : '#6c737d';
      context.strokeStyle = '#aeb4bc';
      context.lineWidth = 2;
      context.beginPath();
      context.roundRect(left + 3, top + 3, tileSize - 6, tileSize - 6, isBeltLike ? 8 : 10);
      context.fill();
      context.stroke();

      context.fillStyle = machine.kind === 'belt' ? '#424a56' : '#4b5563';
      context.beginPath();
      context.roundRect(left + 7, top + 7, tileSize - 14, tileSize - 14, isBeltLike ? 7 : 9);
      context.fill();

      context.fillStyle = machine.kind === 'belt' ? '#e2e8f0' : '#f8fafc';
      context.font = `${Math.max(10, tileSize * 0.18)}px "Avenir Next", sans-serif`;
      context.textAlign = 'center';
      const machineTag = machine.kind === 'source'
        ? ITEM_SHORT_LABELS[machine.outputKind ?? 'copper-coil']
        : machine.kind === 'assembler'
          ? ASSEMBLER_RECIPES[machine.recipeId ?? 'logic-board'].shortLabel
          : def.shortLabel;
      context.fillText(machineTag, left + tileSize / 2, top + tileSize * 0.43);

      context.fillStyle = '#cbd5e1';
      context.font = `${Math.max(11, tileSize * 0.24)}px ui-monospace, monospace`;
      context.fillText(DIRECTION_MARKERS[machine.direction], left + tileSize / 2, top + tileSize * 0.72);

      drawMachineFace(context, machine.kind, left, top, tileSize, machine.outputKind ?? 'copper-coil');

      if (machine.id === selectedMachineId) {
        context.strokeStyle = '#22d3ee';
        context.lineWidth = 3;
        context.strokeRect(left + 1.5, top + 1.5, tileSize - 3, tileSize - 3);
      }

      if (machine.kind === 'belt') {
        drawBeltChevron(context, machine.direction, left, top, tileSize, '#facc15', renderTick);
      }

      if (machine.kind === 'splitter') {
        drawSplitterGlyph(context, left, top, tileSize, renderTick);
      }

      if (machine.kind === 'assembler') {
        const progress = Math.min((machine.craftProgressMs ?? 0) / ASSEMBLER_CYCLE_MS, 1);
        context.fillStyle = '#172554';
        context.fillRect(left + 7, top + tileSize - 12, tileSize - 14, 5);
        context.fillStyle = '#60a5fa';
        context.fillRect(left + 7, top + tileSize - 12, (tileSize - 14) * progress, 5);

        if ((machine.bufferedItems ?? []).length > 0) {
          context.fillStyle = ITEM_COLORS[machine.bufferedItems![0]];
          context.beginPath();
          context.arc(left + tileSize * 0.78, top + tileSize * 0.24, Math.max(4, tileSize * 0.1), 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    for (const item of floor.items) {
      const vector = DIRECTION_VECTORS[item.direction];
      const centerX = originX + item.x * tileSize + tileSize / 2;
      const centerY = originY + item.y * tileSize + tileSize / 2;
      const itemX = centerX + vector.x * (item.progress - 0.5) * tileSize * 0.78;
      const itemY = centerY + vector.y * (item.progress - 0.5) * tileSize * 0.78;

      context.fillStyle = ITEM_COLORS[item.kind];
      context.beginPath();
      context.arc(itemX, itemY, Math.max(4, tileSize * 0.12), 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = '#e2e8f0';
      context.lineWidth = 1.5;
      context.stroke();

      if (tileSize >= 34) {
        context.fillStyle = '#ffffff';
        context.font = `${Math.max(7, tileSize * 0.12)}px ui-monospace, monospace`;
        context.fillText(ITEM_SHORT_LABELS[item.kind], itemX, itemY + 2);
      }
    }
  }, [camera.panX, camera.panY, dragCells, floor, geometry, renderTick, selectedMachineId, selectedTool]);

  const canDragBuild = selectedTool === 'belt' || selectedTool === 'erase';

  const updateZoom = (delta: number) => {
    setCamera((current) => {
      const nextZoom = clamp(current.zoom + delta, MIN_ZOOM, MAX_ZOOM);
      const nextGeometry = computeGeometry(canvasSize.width, canvasSize.height, floor.width, floor.height, nextZoom);
      return clampCamera({
        ...current,
        zoom: nextZoom
      }, nextGeometry);
    });
  };

  const resolveCellFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left - (geometry.baseX + camera.panX);
    const localY = clientY - rect.top - (geometry.baseY + camera.panY);

    if (localX < 0 || localY < 0 || localX > geometry.boardWidth || localY > geometry.boardHeight) {
      return null;
    }

    return {
      x: Math.floor(localX / geometry.tileSize),
      y: Math.floor(localY / geometry.tileSize)
    };
  };

  const resolveWorldPointFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const localX = clientX - rect.left - (geometry.baseX + camera.panX);
    const localY = clientY - rect.top - (geometry.baseY + camera.panY);

    if (localX < 0 || localY < 0 || localX > geometry.boardWidth || localY > geometry.boardHeight) {
      return null;
    }

    return {
      x: localX / geometry.tileSize,
      y: localY / geometry.tileSize
    };
  };

  const appendDragCell = (cell: { x: number; y: number }) => {
    const pointerState = pointerStateRef.current;

    if (!pointerState) {
      return;
    }

    const lastCell = pointerState.cells[pointerState.cells.length - 1];

    if (lastCell && lastCell.x === cell.x && lastCell.y === cell.y) {
      return;
    }

    if (pointerState.cells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y)) {
      return;
    }

    pointerState.cells = [...pointerState.cells, cell];
    setDragCells(pointerState.cells);
  };

  const finishInteraction = () => {
    const pointerState = pointerStateRef.current;

    if (!pointerState) {
      return;
    }

    pointerStateRef.current = null;
    setDragCells([]);

    if (pointerState.mode === 'drag-build') {
      if (pointerState.cells.length > 1) {
        onDragPath(pointerState.cells);
        return;
      }

      if (pointerState.cells[0]) {
        onInteract(pointerState.cells[0].x, pointerState.cells[0].y);
      }
      return;
    }

    if (pointerState.mode === 'pending' && pointerState.cells[0]) {
      onInteract(pointerState.cells[0].x, pointerState.cells[0].y);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const cell = resolveCellFromPointer(event.clientX, event.clientY);

    event.currentTarget.setPointerCapture(event.pointerId);

    if (activePointersRef.current.size >= 2) {
      const points = getFirstTwoPointers(activePointersRef.current);

      if (points) {
        const distance = getPointerDistance(points[0], points[1]);
        const midpoint = getPointerMidpoint(points[0], points[1]);
        const anchor = resolveWorldPointFromPointer(midpoint.x, midpoint.y);
        pinchStateRef.current = {
          startDistance: Math.max(distance, 1),
          startZoom: camera.zoom,
          anchorWorldX: anchor?.x ?? floor.width / 2,
          anchorWorldY: anchor?.y ?? floor.height / 2
        };
      }

      pointerStateRef.current = null;
      setDragCells([]);
      return;
    }

    pointerStateRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: camera.panX,
      startPanY: camera.panY,
      mode: canDragBuild ? 'drag-build' : 'pending',
      cells: cell ? [cell] : []
    };

    setDragCells(cell && canDragBuild ? [cell] : []);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    const pinchState = pinchStateRef.current;

    if (pinchState && activePointersRef.current.size >= 2) {
      const points = getFirstTwoPointers(activePointersRef.current);

      if (!points) {
        return;
      }

      const distance = Math.max(getPointerDistance(points[0], points[1]), 1);
      const midpoint = getPointerMidpoint(points[0], points[1]);
      const nextZoom = clamp(pinchState.startZoom * (distance / pinchState.startDistance), MIN_ZOOM, MAX_ZOOM);
      const nextGeometry = computeGeometry(canvasSize.width, canvasSize.height, floor.width, floor.height, nextZoom);
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const localMidX = midpoint.x - rect.left;
      const localMidY = midpoint.y - rect.top;
      const nextPanX = localMidX - nextGeometry.baseX - pinchState.anchorWorldX * nextGeometry.tileSize;
      const nextPanY = localMidY - nextGeometry.baseY - pinchState.anchorWorldY * nextGeometry.tileSize;

      setCamera(() => clampCamera({
        zoom: nextZoom,
        panX: nextPanX,
        panY: nextPanY
      }, nextGeometry));
      return;
    }

    const pointerState = pointerStateRef.current;

    if (!pointerState || pointerState.pointerId !== event.pointerId) {
      return;
    }

    if (pointerState.mode === 'drag-build') {
      const cell = resolveCellFromPointer(event.clientX, event.clientY);

      if (cell) {
        appendDragCell(cell);
      }
      return;
    }

    const deltaX = event.clientX - pointerState.startClientX;
    const deltaY = event.clientY - pointerState.startClientY;

    if (pointerState.mode === 'pending' && Math.hypot(deltaX, deltaY) > PAN_THRESHOLD) {
      pointerState.mode = 'pan';
    }

    if (pointerState.mode === 'pan') {
      setCamera((current) => clampCamera({
        ...current,
        panX: pointerState.startPanX + deltaX,
        panY: pointerState.startPanY + deltaY
      }, geometry));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(event.pointerId);

    if (pinchStateRef.current) {
      if (activePointersRef.current.size < 2) {
        pinchStateRef.current = null;
        pointerStateRef.current = null;
        setDragCells([]);
      }
      return;
    }

    const pointerState = pointerStateRef.current;

    if (pointerState && pointerState.pointerId === event.pointerId && pointerState.mode === 'drag-build') {
      const cell = resolveCellFromPointer(event.clientX, event.clientY);

      if (cell) {
        appendDragCell(cell);
      }
    }

    finishInteraction();
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    updateZoom(event.deltaY > 0 ? -0.08 : 0.08);
  };

  return (
    <div className="factory-board-shell" ref={wrapperRef}>
      <div className="factory-board-badge">Tool: {hoveredLabel}</div>
      <div className="board-zoom-controls">
        <button className="board-zoom-button" onClick={() => updateZoom(-0.18)} type="button">-</button>
        <button className="board-zoom-button" onClick={() => setCamera((current) => clampCamera({ ...current, zoom: 1, panX: 0, panY: 0 }, geometry))} type="button">Fit</button>
        <button className="board-zoom-button" onClick={() => updateZoom(0.18)} type="button">+</button>
      </div>
      <canvas
        onPointerCancel={(event) => {
          activePointersRef.current.delete(event.pointerId);
          if (pinchStateRef.current) {
            if (activePointersRef.current.size < 2) {
              pinchStateRef.current = null;
            }
            setDragCells([]);
            pointerStateRef.current = null;
            return;
          }
          finishInteraction();
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        ref={canvasRef}
      />
    </div>
  );
}

function getFirstTwoPointers(pointerMap: Map<number, { x: number; y: number }>) {
  const points = Array.from(pointerMap.values());
  return points.length >= 2 ? [points[0], points[1]] as const : null;
}

function getPointerDistance(left: { x: number; y: number }, right: { x: number; y: number }) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function getPointerMidpoint(left: { x: number; y: number }, right: { x: number; y: number }) {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2
  };
}

function clampCamera(camera: CameraState, geometry: {
  width: number;
  height: number;
  boardWidth: number;
  boardHeight: number;
  baseX: number;
  baseY: number;
  tileSize: number;
}) {
  const maxPanX = Math.max(0, (geometry.boardWidth - geometry.width) / 2 + 18);
  const maxPanY = Math.max(0, (geometry.boardHeight - geometry.height) / 2 + 18);

  return {
    zoom: clamp(camera.zoom, MIN_ZOOM, MAX_ZOOM),
    panX: clamp(camera.panX, -maxPanX, maxPanX),
    panY: clamp(camera.panY, -maxPanY, maxPanY)
  };
}

function computeGeometry(canvasWidth: number, canvasHeight: number, floorWidth: number, floorHeight: number, zoom: number) {
  const width = Math.max(canvasWidth, 1);
  const height = Math.max(canvasHeight, 1);
  const usableHeight = Math.max(120, height - BOARD_PADDING - TOP_CONTENT_GUTTER - BOTTOM_CONTENT_GUTTER);
  const fitTileSize = Math.min((width - BOARD_PADDING) / floorWidth, usableHeight / floorHeight);
  const tileSize = Math.max(20, fitTileSize * zoom);
  const boardWidth = tileSize * floorWidth;
  const boardHeight = tileSize * floorHeight;
  const baseY = Math.max(TOP_CONTENT_GUTTER, TOP_CONTENT_GUTTER + (usableHeight - boardHeight) / 2);

  return {
    width,
    height,
    tileSize,
    boardWidth,
    boardHeight,
    baseX: (width - boardWidth) / 2,
    baseY
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function drawHazardBorder(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const stripe = 10;

  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();

  context.strokeStyle = '#f97316';
  context.lineWidth = 5;

  for (let offset = -height; offset < width + height; offset += stripe) {
    context.beginPath();
    context.moveTo(x + offset, y);
    context.lineTo(x + offset + height, y + height);
    context.stroke();
  }

  context.restore();
}

function drawBeltChevron(
  context: CanvasRenderingContext2D,
  direction: Direction,
  left: number,
  top: number,
  tileSize: number,
  color: string,
  renderTick: number
) {
  const centerX = left + tileSize / 2;
  const centerY = top + tileSize / 2;
  const size = tileSize * 0.16;
  context.save();
  context.translate(centerX, centerY);
  context.rotate(rotationForDirection(direction));
  const travel = ((renderTick % 12) / 12 - 0.5) * tileSize * 0.28;
  context.translate(travel, 0);
  context.fillStyle = '#202833';
  context.fillRect(-tileSize * 0.24, -tileSize * 0.11, tileSize * 0.48, tileSize * 0.22);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(-size, -size * 0.8);
  context.lineTo(size, 0);
  context.lineTo(-size, size * 0.8);
  context.closePath();
  context.fill();
  context.restore();
}

function drawMachineFace(
  context: CanvasRenderingContext2D,
  kind: string,
  left: number,
  top: number,
  tileSize: number,
  outputColorKey: keyof typeof ITEM_COLORS
) {
  if (kind === 'source') {
    context.fillStyle = ITEM_COLORS[outputColorKey];
    context.beginPath();
    context.arc(left + tileSize * 0.3, top + tileSize * 0.3, tileSize * 0.1, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1f2937';
    context.fillRect(left + tileSize * 0.2, top + tileSize * 0.52, tileSize * 0.32, tileSize * 0.08);
    context.fillStyle = '#cbd5e1';
    context.fillRect(left + tileSize * 0.58, top + tileSize * 0.22, tileSize * 0.09, tileSize * 0.22);
    return;
  }

  if (kind === 'seller') {
    context.strokeStyle = '#fb923c';
    context.lineWidth = 2;
    context.strokeRect(left + tileSize * 0.25, top + tileSize * 0.25, tileSize * 0.5, tileSize * 0.18);
    context.strokeRect(left + tileSize * 0.25, top + tileSize * 0.58, tileSize * 0.5, tileSize * 0.18);
    context.fillStyle = '#111827';
    context.fillRect(left + tileSize * 0.31, top + tileSize * 0.44, tileSize * 0.38, tileSize * 0.06);
    return;
  }

  if (kind === 'assembler') {
    context.strokeStyle = '#93c5fd';
    context.lineWidth = 1.5;
    context.strokeRect(left + tileSize * 0.26, top + tileSize * 0.26, tileSize * 0.48, tileSize * 0.28);
    context.beginPath();
    context.moveTo(left + tileSize * 0.38, top + tileSize * 0.26);
    context.lineTo(left + tileSize * 0.38, top + tileSize * 0.54);
    context.moveTo(left + tileSize * 0.5, top + tileSize * 0.26);
    context.lineTo(left + tileSize * 0.5, top + tileSize * 0.54);
    context.moveTo(left + tileSize * 0.62, top + tileSize * 0.26);
    context.lineTo(left + tileSize * 0.62, top + tileSize * 0.54);
    context.stroke();
    context.fillStyle = '#0f172a';
    context.fillRect(left + tileSize * 0.28, top + tileSize * 0.61, tileSize * 0.44, tileSize * 0.06);
  }
}

function drawSplitterGlyph(context: CanvasRenderingContext2D, left: number, top: number, tileSize: number, renderTick: number) {
  context.strokeStyle = '#c084fc';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(left + tileSize * 0.28, top + tileSize * 0.32);
  context.lineTo(left + tileSize * 0.56, top + tileSize * 0.32);
  context.lineTo(left + tileSize * 0.56, top + tileSize * 0.2);
  context.moveTo(left + tileSize * 0.56, top + tileSize * 0.32);
  context.lineTo(left + tileSize * 0.72, top + tileSize * 0.32);
  context.moveTo(left + tileSize * 0.56, top + tileSize * 0.32);
  context.lineTo(left + tileSize * 0.56, top + tileSize * 0.58);
  context.stroke();

  context.fillStyle = '#facc15';
  context.beginPath();
  context.arc(left + tileSize * 0.56, top + tileSize * (0.43 + (((renderTick % 10) - 5) / 120)), tileSize * 0.045, 0, Math.PI * 2);
  context.fill();
}

function drawTileBolts(context: CanvasRenderingContext2D, left: number, top: number, tileSize: number) {
  const boltOffset = tileSize * 0.08;
  const boltRadius = Math.max(1.3, tileSize * 0.023);
  context.fillStyle = '#475569';

  const points = [
    [left + boltOffset, top + boltOffset],
    [left + tileSize - boltOffset, top + boltOffset],
    [left + boltOffset, top + tileSize - boltOffset],
    [left + tileSize - boltOffset, top + tileSize - boltOffset]
  ];

  for (const [x, y] of points) {
    context.beginPath();
    context.arc(x, y, boltRadius, 0, Math.PI * 2);
    context.fill();
  }
}

function rotationForDirection(direction: Direction) {
  if (direction === 'right') {
    return 0;
  }
  if (direction === 'down') {
    return Math.PI / 2;
  }
  if (direction === 'left') {
    return Math.PI;
  }
  return -Math.PI / 2;
}
