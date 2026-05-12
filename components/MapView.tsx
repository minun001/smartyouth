'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appPath } from '@/lib/clientConfig';
import type { BoothWithStatus } from '@/lib/types';
import {
  boothTypeLabels,
  congestionStatusColor,
  congestionStatusLabel,
  isCongestedLevel,
  operationStatusColor,
  operationStatusLabels,
  situationColors,
  situationStatusColor
} from '@/lib/statusLabels';
import BoothCard from './BoothCard';

type MapViewProps = {
  booths: BoothWithStatus[];
  editable?: boolean;
  fullScreen?: boolean;
  showProblemList?: boolean;
  onEdit?: (booth: BoothWithStatus) => void;
};

type MapTransform = {
  scale: number;
  x: number;
  y: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

const MAP_IMAGE_WIDTH = 1135;
const MAP_IMAGE_HEIGHT = 710;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.2;
const TOUCH_FOCUS_ZOOM = 0.92;
const MARKER_SIZE = 44;
const BOOTH_POSITION_OVERRIDES: Record<number, Point> = {
  8: { x: 33.0, y: 64.8 }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFitScale(size: ViewportSize) {
  if (!size.width || !size.height) {
    return 1;
  }

  return clamp(Math.min(size.width / MAP_IMAGE_WIDTH, size.height / MAP_IMAGE_HEIGHT), MIN_ZOOM, 1);
}

function getDefaultScale(size: ViewportSize) {
  if (!size.width || !size.height) {
    return 1;
  }

  const fitScale = getFitScale(size);
  const widthFitScale = size.width / MAP_IMAGE_WIDTH;

  return clamp(widthFitScale, fitScale, MAX_ZOOM);
}

function getCenteredTransform(size: ViewportSize, scale: number): MapTransform {
  return {
    scale,
    x: (size.width - MAP_IMAGE_WIDTH * scale) / 2,
    y: (size.height - MAP_IMAGE_HEIGHT * scale) / 2
  };
}

function getDefaultTransform(size: ViewportSize) {
  if (!size.width || !size.height) {
    return { scale: 1, x: 0, y: 0 };
  }

  return constrainTransform(getCenteredTransform(size, getDefaultScale(size)), size);
}

function constrainTransform(transform: MapTransform, size: ViewportSize): MapTransform {
  if (!size.width || !size.height) {
    return transform;
  }

  const scale = clamp(transform.scale, getFitScale(size), MAX_ZOOM);
  const scaledWidth = MAP_IMAGE_WIDTH * scale;
  const scaledHeight = MAP_IMAGE_HEIGHT * scale;
  const centeredX = (size.width - scaledWidth) / 2;
  const centeredY = (size.height - scaledHeight) / 2;
  const x =
    scaledWidth <= size.width
      ? centeredX
      : clamp(transform.x, size.width - scaledWidth - MARKER_SIZE / 2, MARKER_SIZE / 2);
  const y =
    scaledHeight <= size.height
      ? centeredY
      : clamp(transform.y, size.height - scaledHeight - MARKER_SIZE / 2, MARKER_SIZE / 2);

  return { scale, x, y };
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
}

function getViewportPoint(point: Point, viewport: HTMLDivElement | null): Point {
  if (!viewport) {
    return point;
  }

  const rect = viewport.getBoundingClientRect();
  return {
    x: point.x - rect.left,
    y: point.y - rect.top
  };
}

function getBoothMapPoint(booth: BoothWithStatus): Point {
  const position = BOOTH_POSITION_OVERRIDES[booth.boothNo] ?? { x: booth.x ?? 0, y: booth.y ?? 0 };

  return {
    x: (position.x / 100) * MAP_IMAGE_WIDTH,
    y: (position.y / 100) * MAP_IMAGE_HEIGHT
  };
}

function getBoothFocusTarget(size: ViewportSize, fullScreen: boolean): Point {
  if (!fullScreen) {
    return { x: size.width / 2, y: size.height / 2 };
  }

  const verticalRatio = size.width < 640 ? 0.34 : size.width < 1024 ? 0.42 : 0.5;

  return {
    x: size.width / 2,
    y: size.height * verticalRatio
  };
}

function getFocusScale(size: ViewportSize, currentScale: number) {
  const widthFitScale = getDefaultScale(size);
  const touchFloor = size.width < 768 ? TOUCH_FOCUS_ZOOM : widthFitScale;

  return clamp(Math.max(currentScale, widthFitScale, touchFloor), getFitScale(size), MAX_ZOOM);
}

function getBoothFocusTransform(
  booth: BoothWithStatus,
  size: ViewportSize,
  currentTransform: MapTransform,
  fullScreen: boolean
) {
  const mapPoint = getBoothMapPoint(booth);
  const target = getBoothFocusTarget(size, fullScreen);
  const scale = getFocusScale(size, currentTransform.scale);

  return constrainTransform(
    {
      scale,
      x: target.x - mapPoint.x * scale,
      y: target.y - mapPoint.y * scale
    },
    size
  );
}

export default function MapView({
  booths,
  editable = false,
  fullScreen = false,
  showProblemList = true,
  onEdit
}: MapViewProps) {
  const [imageMissing, setImageMissing] = useState(false);
  const [selectedBoothNo, setSelectedBoothNo] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const lastPanPointRef = useRef<Point | null>(null);
  const lastPinchRef = useRef<{ distance: number; midpoint: Point } | null>(null);
  const didDragRef = useRef(false);
  const hasMeasuredViewportRef = useRef(false);
  const hasUserAdjustedMapRef = useRef(false);
  const transformRef = useRef<MapTransform>({ scale: 1, x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [transform, setTransformState] = useState<MapTransform>({ scale: 1, x: 0, y: 0 });
  const hasPins = booths.some((booth) => typeof booth.x === 'number' && typeof booth.y === 'number');
  const problemBooths = booths.filter((booth) => booth.problem);
  const selectedBooth = booths.find((booth) => booth.boothNo === selectedBoothNo);
  const minScale = useMemo(() => getFitScale(viewportSize), [viewportSize]);
  const defaultTransform = useMemo(() => getDefaultTransform(viewportSize), [viewportSize]);
  const canZoomOut = transform.scale > minScale + 0.01;
  const canReset =
    Math.abs(transform.scale - defaultTransform.scale) > 0.01 ||
    Math.abs(transform.x - defaultTransform.x) > 1 ||
    Math.abs(transform.y - defaultTransform.y) > 1;

  const setTransform = useCallback(
    (nextTransform: MapTransform) => {
      const constrained = constrainTransform(nextTransform, viewportSize);
      transformRef.current = constrained;
      setTransformState(constrained);
    },
    [viewportSize]
  );

  const zoomAround = useCallback(
    (nextScale: number, point: Point) => {
      hasUserAdjustedMapRef.current = true;
      const current = transformRef.current;
      const scale = clamp(nextScale, minScale, MAX_ZOOM);
      const mapX = (point.x - current.x) / current.scale;
      const mapY = (point.y - current.y) / current.scale;
      setTransform({
        scale,
        x: point.x - mapX * scale,
        y: point.y - mapY * scale
      });
    },
    [minScale, setTransform]
  );

  const resetTransform = useCallback(() => {
    hasUserAdjustedMapRef.current = false;
    setTransform(defaultTransform);
  }, [defaultTransform, setTransform]);

  const focusBooth = useCallback(
    (booth: BoothWithStatus) => {
      if (!viewportSize.width || !viewportSize.height) {
        return;
      }

      hasUserAdjustedMapRef.current = true;
      setTransform(getBoothFocusTransform(booth, viewportSize, transformRef.current, fullScreen));
    },
    [fullScreen, setTransform, viewportSize]
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height
      };
      setViewportSize(nextSize);
      const shouldUseDefault = !hasMeasuredViewportRef.current || !hasUserAdjustedMapRef.current;
      const nextTransform = constrainTransform(
        shouldUseDefault
          ? getDefaultTransform(nextSize)
          : {
              ...transformRef.current,
              scale: Math.max(transformRef.current.scale, getFitScale(nextSize))
            },
        nextSize
      );
      hasMeasuredViewportRef.current = true;
      transformRef.current = nextTransform;
      setTransformState(nextTransform);
    });
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-booth-marker], [data-map-control], [data-map-panel]')) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    didDragRef.current = false;

    const pointers = Array.from(pointersRef.current.values());
    if (pointers.length === 1) {
      lastPanPointRef.current = pointers[0];
      lastPinchRef.current = null;
    } else if (pointers.length === 2) {
      lastPanPointRef.current = null;
      lastPinchRef.current = {
        distance: getDistance(pointers[0], pointers[1]),
        midpoint: getMidpoint(pointers[0], pointers[1])
      };
    }
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }

      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pointers = Array.from(pointersRef.current.values());

      if (pointers.length === 1 && lastPanPointRef.current) {
        const nextPoint = pointers[0];
        const dx = nextPoint.x - lastPanPointRef.current.x;
        const dy = nextPoint.y - lastPanPointRef.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) {
          didDragRef.current = true;
          hasUserAdjustedMapRef.current = true;
        }
        lastPanPointRef.current = nextPoint;
        setTransform({
          ...transformRef.current,
          x: transformRef.current.x + dx,
          y: transformRef.current.y + dy
        });
      } else if (pointers.length === 2) {
        const distance = getDistance(pointers[0], pointers[1]);
        const midpoint = getMidpoint(pointers[0], pointers[1]);
        const lastPinch = lastPinchRef.current;
        if (lastPinch && lastPinch.distance > 0) {
          const nextScale = transformRef.current.scale * (distance / lastPinch.distance);
          didDragRef.current = true;
          zoomAround(nextScale, getViewportPoint(midpoint, viewportRef.current));
        }
        lastPinchRef.current = { distance, midpoint };
      }
    },
    [setTransform, zoomAround]
  );

  const clearPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    const pointers = Array.from(pointersRef.current.values());
    lastPanPointRef.current = pointers.length === 1 ? pointers[0] : null;
    lastPinchRef.current =
      pointers.length === 2
        ? {
            distance: getDistance(pointers[0], pointers[1]),
            midpoint: getMidpoint(pointers[0], pointers[1])
          }
        : null;
  }, []);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      zoomAround(transformRef.current.scale * (event.deltaY > 0 ? 0.88 : 1.12), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    },
    [zoomAround]
  );

  return (
    <section className={fullScreen ? 'relative flex h-full min-w-0 flex-1 flex-col bg-slate-100' : 'space-y-4'}>
      {fullScreen ? (
        <div className="shrink-0 border-b border-[var(--line)] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(0,96,176,0.10)]">
          <MapLegend />
        </div>
      ) : null}

      {!imageMissing ? (
        <div
          className={
            fullScreen
              ? 'relative min-h-0 flex-1 overflow-hidden bg-slate-100'
              : 'overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm'
          }
        >
          {!fullScreen ? (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[var(--asan-blue)] via-[var(--asan-sky)] to-[var(--asan-green)] px-4 py-3 text-white">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--asan-yellow)]">Field Map</div>
                <div className="text-lg font-black">부스 배치도</div>
              </div>
              <MapLegend />
            </div>
          ) : null}

          <div
            ref={viewportRef}
            data-map-viewport
            className={
              fullScreen
                ? 'relative h-full min-h-0 touch-none overflow-hidden overscroll-contain bg-slate-100'
                : 'relative h-[min(68vh,680px)] min-h-[360px] touch-none overflow-hidden bg-slate-100'
            }
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={clearPointer}
            onPointerCancel={clearPointer}
            onLostPointerCapture={clearPointer}
            onWheel={handleWheel}
          >
            <div
              data-map-layer
              className="absolute left-0 top-0 origin-top-left select-none"
              style={{
                width: MAP_IMAGE_WIDTH,
                height: MAP_IMAGE_HEIGHT,
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appPath('/booth-map.png')}
                alt="부스배치도"
                width={MAP_IMAGE_WIDTH}
                height={MAP_IMAGE_HEIGHT}
                className="h-full w-full max-w-none select-none"
                draggable={false}
                onError={() => setImageMissing(true)}
              />
            </div>

              {hasPins
              ? booths
                  .filter((booth) => typeof booth.x === 'number' && typeof booth.y === 'number')
                  .map((booth) => {
                    const selected = booth.boothNo === selectedBoothNo;
                    const isCongested = isCongestedLevel(booth.status.congestionLevel);
                    const position = BOOTH_POSITION_OVERRIDES[booth.boothNo] ?? { x: booth.x ?? 0, y: booth.y ?? 0 };
                    const left = transform.x + (position.x / 100) * MAP_IMAGE_WIDTH * transform.scale;
                    const top = transform.y + (position.y / 100) * MAP_IMAGE_HEIGHT * transform.scale;
                    const markerColor = situationStatusColor(
                      booth.status.operationStatus,
                      booth.status.congestionLevel
                    );

                    return (
                      <button
                        key={booth.boothNo}
                        type="button"
                        data-booth-marker={booth.boothNo}
                        aria-label={`부스 ${booth.boothNo} ${booth.name} 보기`}
                        onPointerDown={() => {
                          didDragRef.current = false;
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (didDragRef.current) {
                            event.preventDefault();
                            didDragRef.current = false;
                            return;
                          }
                          focusBooth(booth);
                          setSelectedBoothNo(booth.boothNo);
                        }}
                        className={`absolute z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-95 ${
                          selected ? 'z-30' : ''
                        }`}
                        style={{ left, top }}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-lg ${
                            selected ? 'ring-4 ring-[var(--asan-yellow)]' : ''
                          } ${isCongested ? 'shadow-orange-200' : ''}`}
                          style={{ backgroundColor: markerColor }}
                        >
                          {booth.boothNo}
                        </span>
                      </button>
                    );
                  })
                : null}
            <div className="absolute right-3 top-3 z-40 flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                data-map-control="zoom-in"
                onClick={() =>
                  zoomAround(transform.scale * 1.2, {
                    x: viewportSize.width / 2,
                    y: viewportSize.height / 2
                  })
                }
                className="flex h-11 w-11 items-center justify-center border-r border-slate-200 text-xl font-black text-slate-800"
                aria-label="지도 확대"
              >
                +
              </button>
              <button
                type="button"
                data-map-control="zoom-out"
                onClick={() =>
                  zoomAround(transform.scale / 1.2, {
                    x: viewportSize.width / 2,
                    y: viewportSize.height / 2
                  })
                }
                disabled={!canZoomOut}
                className="flex h-11 w-11 items-center justify-center border-r border-slate-200 text-xl font-black text-slate-800 disabled:text-slate-300"
                aria-label="지도 축소"
              >
                -
              </button>
              <button
                type="button"
                data-map-control="reset"
                onClick={resetTransform}
                disabled={!canReset}
                className="min-h-11 px-3 text-xs font-black text-slate-700 disabled:text-slate-300"
                aria-label="지도 폭 맞춤"
              >
                폭맞춤
              </button>
            </div>
          </div>

          {fullScreen && selectedBooth ? (
            <SelectedBoothFloat
              booth={selectedBooth}
              editable={editable}
              onClose={() => setSelectedBoothNo(null)}
              onEdit={onEdit}
            />
          ) : null}
        </div>
      ) : (
        <div
          className={`${
            fullScreen ? 'm-4' : ''
          } rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-base font-black text-slate-600`}
        >
          부스배치도 이미지를 public/booth-map.png에 추가해주세요.
        </div>
      )}

      {!imageMissing && !hasPins ? (
        <div className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm font-bold text-slate-600 shadow-sm">
          좌표가 없어서 배치도 아래에 문제 부스를 표시합니다.
        </div>
      ) : null}

      {!fullScreen && selectedBooth ? (
        <div className="space-y-3 rounded-lg border border-[var(--line)] bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">선택 부스</h2>
            <button
              type="button"
              onClick={() => setSelectedBoothNo(null)}
              className="min-h-10 rounded-md bg-slate-100 px-3 text-sm font-black text-slate-700"
            >
              선택 해제
            </button>
          </div>
          <BoothCard
            key={selectedBooth.boothNo}
            booth={selectedBooth}
            defaultExpanded
            editable={editable}
            onEdit={onEdit}
          />
        </div>
      ) : null}

      {showProblemList ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">문제 부스</h2>
            <span className="rounded-md bg-orange-500 px-3 py-1 text-sm font-black text-white">{problemBooths.length}</span>
          </div>
          {problemBooths.length > 0 ? (
            problemBooths.map((booth) => <BoothCard key={booth.boothNo} booth={booth} />)
          ) : (
            <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-500">현재 문제 부스가 없습니다.</div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SelectedBoothFloat({
  booth,
  editable,
  onClose,
  onEdit
}: {
  booth: BoothWithStatus;
  editable: boolean;
  onClose: () => void;
  onEdit?: (booth: BoothWithStatus) => void;
}) {
  const status = booth.status;
  const operationColor = operationStatusColor(status.operationStatus);
  const congestionColor = congestionStatusColor(status.congestionLevel);
  const situationColor = situationStatusColor(status.operationStatus, status.congestionLevel);
  const name = booth.name.length > 24 ? `${booth.name.slice(0, 24)}...` : booth.name;

  return (
    <div
      data-map-panel
      className="pointer-events-none absolute inset-x-3 bottom-3 z-30 mx-auto max-w-lg"
    >
      <article className="pointer-events-auto rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-black text-white"
              style={{ backgroundColor: situationColor }}
            >
              {booth.boothNo}
            </span>
            <div className="min-w-0">
              <div className="truncate text-base font-black text-slate-950">{name}</div>
              <div className="mt-0.5 truncate text-xs font-black text-slate-500">{boothTypeLabels[booth.type]} 부스</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl font-black text-slate-700"
            aria-label="선택 닫기"
          >
            x
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStatus label="상태" value={operationStatusLabels[status.operationStatus]} color={operationColor} />
          <MiniStatus label="혼잡" value={congestionStatusLabel(status.congestionLevel)} color={congestionColor} />
        </div>

        {editable ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => onEdit?.(booth)}
              className="min-h-11 shrink-0 rounded-lg bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] px-4 text-sm font-black text-white"
            >
              수정
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}

function MiniStatus({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-slate-50 px-2 py-2 text-center">
      <div className="text-[10px] font-black text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-xs font-black text-slate-950" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

const legendItems = [
  { color: situationColors.normal, label: '정상' },
  { color: situationColors.open, label: '운영중' },
  { color: situationColors.attention, label: '중단/혼잡' },
  { color: situationColors.closed, label: '마감' }
];

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {legendItems.map((item) => (
        <LegendDot key={item.label} color={item.color} label={item.label} />
      ))}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-base font-black shadow-sm sm:text-lg"
      style={{ color }}
    >
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
