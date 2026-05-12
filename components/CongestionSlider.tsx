'use client';

import { congestionStatusColor, congestionStatusLabel, isCongestedLevel } from '@/lib/statusLabels';
import type { CongestionLevel } from '@/lib/types';

type CongestionSliderProps = {
  value: CongestionLevel;
  disabled?: boolean;
  onChange: (value: CongestionLevel) => void;
};

export default function CongestionSlider({ value, disabled, onChange }: CongestionSliderProps) {
  const congested = isCongestedLevel(value);
  const nextValue: CongestionLevel = congested ? 0 : 3;
  const activeColor = congestionStatusColor(value);
  const normalColor = congestionStatusColor(0);
  const congestedColor = congestionStatusColor(3);
  const activeLabel = congestionStatusLabel(value);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-[inset_7px_7px_18px_rgba(15,23,42,0.08),inset_-7px_-7px_18px_rgba(255,255,255,0.95)]">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(0)}
          className="min-h-12 rounded-lg px-3 text-2xl font-black disabled:cursor-not-allowed disabled:opacity-60"
          style={{ color: congested ? '#64748b' : normalColor }}
        >
          여유
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(3)}
          className="min-h-12 rounded-lg px-3 text-2xl font-black disabled:cursor-not-allowed disabled:opacity-60"
          style={{ color: congested ? congestedColor : '#64748b' }}
        >
          혼잡
        </button>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={congested}
        aria-label={`혼잡도 ${activeLabel}. 누르면 ${congested ? '여유' : '혼잡'}으로 변경`}
        disabled={disabled}
        onClick={() => onChange(nextValue)}
        className="relative mt-3 h-16 w-full rounded-full bg-[#eef3f8] shadow-[inset_8px_8px_18px_rgba(15,23,42,0.16),inset_-8px_-8px_18px_rgba(255,255,255,1)] transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          className="absolute top-2 flex h-12 w-[calc(50%-12px)] items-center justify-center rounded-full text-lg font-black text-white shadow-[8px_8px_18px_rgba(15,23,42,0.18),-6px_-6px_14px_rgba(255,255,255,0.9)] transition-all duration-200"
          style={{
            left: congested ? 'calc(50% + 4px)' : '8px',
            backgroundColor: activeColor
          }}
        >
          {activeLabel}
        </span>
      </button>
    </div>
  );
}
