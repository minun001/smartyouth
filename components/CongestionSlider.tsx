'use client';

import { congestionColors, congestionLabels, congestionLevels } from '@/lib/statusLabels';
import type { CongestionLevel } from '@/lib/types';

type CongestionSliderProps = {
  value: CongestionLevel;
  disabled?: boolean;
  onChange: (value: CongestionLevel) => void;
};

export default function CongestionSlider({ value, disabled, onChange }: CongestionSliderProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-500">혼잡도</div>
          <div className="text-3xl font-black" style={{ color: congestionColors[value] }}>
            {congestionLabels[value]}
          </div>
        </div>
        <div className="text-sm font-black text-slate-500">{value}/4</div>
      </div>
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) as CongestionLevel)}
        className="h-4 w-full appearance-none rounded-full disabled:opacity-60"
        style={{
          accentColor: congestionColors[value],
          background: 'linear-gradient(90deg, var(--asan-green), var(--asan-sky), var(--asan-yellow), #f97316, #ef4444)'
        }}
      />
      <div className="mt-3 grid grid-cols-5 gap-1">
        {congestionLevels.map((level) => (
          <button
            key={level}
            type="button"
            disabled={disabled}
            onClick={() => onChange(level)}
            className={`min-h-12 rounded-md px-1 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-60 ${
              value === level ? 'text-white' : 'bg-slate-100 text-slate-700'
            }`}
            style={value === level ? { backgroundColor: congestionColors[level] } : undefined}
          >
            {congestionLabels[level]}
          </button>
        ))}
      </div>
    </div>
  );
}
