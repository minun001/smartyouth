'use client';

import { useState } from 'react';
import { appPath } from '@/lib/clientConfig';
import type { BoothWithStatus } from '@/lib/types';
import {
  boothTypeLabels,
  congestionColors,
  congestionLabels,
  formatRelativeUpdatedAt,
  operationStatusLabels
} from '@/lib/statusLabels';
import BoothCard from './BoothCard';

type MapViewProps = {
  booths: BoothWithStatus[];
  editable?: boolean;
  fullScreen?: boolean;
  showProblemList?: boolean;
  onEdit?: (booth: BoothWithStatus) => void;
};

export default function MapView({
  booths,
  editable = false,
  fullScreen = false,
  showProblemList = true,
  onEdit
}: MapViewProps) {
  const [imageMissing, setImageMissing] = useState(false);
  const [selectedBoothNo, setSelectedBoothNo] = useState<number | null>(null);
  const hasPins = booths.some((booth) => typeof booth.x === 'number' && typeof booth.y === 'number');
  const problemBooths = booths.filter((booth) => booth.problem);
  const selectedBooth = booths.find((booth) => booth.boothNo === selectedBoothNo);

  return (
    <section className={fullScreen ? 'relative flex h-full flex-col bg-slate-100' : 'space-y-4'}>
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
            className={
              fullScreen
                ? 'h-full overflow-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+92px)]'
                : 'overflow-x-auto bg-slate-100'
            }
          >
            <div className={fullScreen ? 'relative min-w-[900px]' : 'relative min-w-[760px]'}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={appPath('/booth-map.png')}
                alt="부스배치도"
                className="h-auto w-full select-none"
                onError={() => setImageMissing(true)}
              />
              {hasPins
                ? booths
                    .filter((booth) => typeof booth.x === 'number' && typeof booth.y === 'number')
                    .map((booth) => {
                      const selected = booth.boothNo === selectedBoothNo;
                      const isCongested = booth.status.congestionLevel >= 3;
                      return (
                        <button
                          key={booth.boothNo}
                          type="button"
                          aria-label={`부스 ${booth.boothNo} ${booth.name} 보기`}
                          onClick={() => setSelectedBoothNo(booth.boothNo)}
                          className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-95 ${
                            selected ? 'z-10' : ''
                          }`}
                          style={{ left: `${booth.x}%`, top: `${booth.y}%` }}
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-black text-white shadow-lg ${
                              booth.problem
                                ? 'bg-red-500 ring-4 ring-red-200'
                                : selected
                                  ? 'bg-[var(--asan-sky)] ring-4 ring-[var(--asan-yellow)]'
                                  : isCongested
                                    ? 'bg-orange-500'
                                    : 'bg-slate-950'
                            }`}
                          >
                            {booth.boothNo}
                          </span>
                        </button>
                      );
                    })
                : null}
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
            <span className="rounded-md bg-red-600 px-3 py-1 text-sm font-black text-white">{problemBooths.length}</span>
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
  const congestionColor = congestionColors[status.congestionLevel];
  const name = booth.name.length > 24 ? `${booth.name.slice(0, 24)}...` : booth.name;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-30 mx-auto max-w-lg">
      <article className="pointer-events-auto rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-base font-black text-white"
              style={{ backgroundColor: booth.problem ? '#ef4444' : congestionColor }}
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
          <MiniStatus label="상태" value={operationStatusLabels[status.operationStatus]} />
          <MiniStatus label="혼잡" value={congestionLabels[status.congestionLevel]} color={congestionColor} />
        </div>

        {booth.problemReasons.length > 0 || status.helpRequested ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {status.helpRequested ? (
              <span className="rounded-md bg-red-600 px-2 py-1 text-xs font-black text-white">도움요청</span>
            ) : null}
            {booth.problemReasons.slice(0, 3).map((reason) => (
              <span key={reason} className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                {reason}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="truncate text-xs font-bold text-slate-500">
            업데이트 {formatRelativeUpdatedAt(status.updatedAt)}
          </div>
          {editable ? (
            <button
              type="button"
              onClick={() => onEdit?.(booth)}
              className="min-h-11 shrink-0 rounded-lg bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] px-4 text-sm font-black text-white"
            >
              수정
            </button>
          ) : null}
        </div>
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
  { dotClass: 'bg-slate-950', textColor: '#020617', label: '정상' },
  { dotClass: 'bg-orange-500', textColor: '#f97316', label: '혼잡' },
  { dotClass: 'bg-red-500', textColor: '#ef4444', label: '문제' }
];

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {legendItems.map((item) => (
        <LegendDot key={item.label} dotClass={item.dotClass} textColor={item.textColor} label={item.label} />
      ))}
    </div>
  );
}

function LegendDot({ dotClass, textColor, label }: { dotClass: string; textColor: string; label: string }) {
  return (
    <span
      className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-base font-black shadow-sm sm:text-lg"
      style={{ color: textColor }}
    >
      <span className={`h-4 w-4 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
