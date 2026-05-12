'use client';

import {
  boothTypeLabels,
  congestionColors,
  congestionLabels,
  congestionSoftColors,
  formatRelativeUpdatedAt,
  materialStatusLabels,
  operationStatusLabels
} from '@/lib/statusLabels';
import type { BoothWithStatus } from '@/lib/types';

type BoothCardProps = {
  booth: BoothWithStatus;
  editable?: boolean;
  onEdit?: (booth: BoothWithStatus) => void;
};

export default function BoothCard({ booth, editable, onEdit }: BoothCardProps) {
  const status = booth.status;

  return (
    <article
      className={`rounded-lg border p-4 shadow-sm ${
        booth.problem ? 'border-red-200' : 'border-slate-200'
      }`}
      style={{ backgroundColor: congestionSoftColors[status.congestionLevel] }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-950 px-2.5 py-1 text-sm font-black text-white">
              {booth.boothNo}
            </span>
            <span className="text-xs font-black text-slate-500">{boothTypeLabels[booth.type]}</span>
          </div>
          <h2 className="mt-2 line-clamp-2 text-lg font-black leading-snug text-slate-950">{booth.name}</h2>
        </div>
        {editable ? (
          <button
            type="button"
            onClick={() => onEdit?.(booth)}
            className="min-h-11 shrink-0 rounded-lg bg-slate-900 px-4 text-sm font-black text-white"
          >
            수정
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <StatusPill label="상태" value={operationStatusLabels[status.operationStatus]} />
        <StatusPill
          label="혼잡"
          value={congestionLabels[status.congestionLevel]}
          color={congestionColors[status.congestionLevel]}
        />
        <StatusPill label="대기" value={status.waitMinutes === 30 ? '30분+' : `${status.waitMinutes}분`} />
        <StatusPill
          label="재료"
          value={materialStatusLabels[status.materialStatus]}
          color={status.materialStatus === 'OUT' ? '#ef4444' : status.materialStatus === 'LOW' ? '#f97316' : '#22c55e'}
        />
      </div>

      {booth.problemReasons.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {booth.problemReasons.map((reason) => (
            <span key={reason} className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 text-xs font-bold text-slate-500">업데이트 {formatRelativeUpdatedAt(status.updatedAt)}</div>
    </article>
  );
}

function StatusPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md bg-white/80 px-3 py-2">
      <div className="text-[11px] font-black text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-base font-black text-slate-900" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
