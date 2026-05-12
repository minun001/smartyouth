'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  boothTypeLabels,
  congestionStatusColor,
  congestionStatusLabel,
  operationStatusColor,
  operationStatusLabels,
  situationStatusColor
} from '@/lib/statusLabels';
import type { BoothWithStatus } from '@/lib/types';

type BoothCardProps = {
  booth: BoothWithStatus;
  editable?: boolean;
  defaultExpanded?: boolean;
  onEdit?: (booth: BoothWithStatus) => void;
  children?: ReactNode;
};

export default function BoothCard({ booth, editable, defaultExpanded = false, onEdit, children }: BoothCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const status = booth.status;
  const priorityColor = situationStatusColor(status.operationStatus, status.congestionLevel);

  return (
    <article
      className="overflow-hidden rounded-lg border bg-white shadow-sm transition"
      style={{ borderColor: priorityColor }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => {
          if (editable && onEdit) {
            setExpanded(true);
            onEdit(booth);
            return;
          }

          setExpanded((current) => !current);
        }}
        className="relative flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left active:bg-slate-50"
      >
        <span className="absolute bottom-0 left-0 top-0 w-1.5" style={{ backgroundColor: priorityColor }} />
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-black text-white shadow-sm"
            style={{ backgroundColor: priorityColor }}
          >
            {booth.boothNo}
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-black text-slate-950">{booth.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-extrabold text-slate-600">
              <span style={{ color: operationStatusColor(status.operationStatus) }}>
                {operationStatusLabels[status.operationStatus]}
              </span>
              <span>·</span>
              <span className="font-black" style={{ color: congestionStatusColor(status.congestionLevel) }}>
                {congestionStatusLabel(status.congestionLevel)}
              </span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-2xl font-black text-slate-400">{expanded ? '−' : '+'}</span>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--line)] bg-slate-50 px-4 pb-4 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-500">{boothTypeLabels[booth.type]} 부스</div>
              <h2 className="mt-1 text-lg font-black leading-snug text-slate-950">{booth.name}</h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatusPill
              label="상태"
              value={operationStatusLabels[status.operationStatus]}
              color={operationStatusColor(status.operationStatus)}
            />
            <StatusPill
              label="혼잡"
              value={congestionStatusLabel(status.congestionLevel)}
              color={congestionStatusColor(status.congestionLevel)}
            />
          </div>

          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      ) : null}
    </article>
  );
}

function StatusPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md bg-white px-3 py-2">
      <div className="text-[11px] font-black text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-base font-black text-slate-900" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
