'use client';

import { materialStatusLabels, materialStatusOrder } from '@/lib/statusLabels';
import type { MaterialStatus } from '@/lib/types';

type MaterialButtonsProps = {
  value: MaterialStatus;
  disabled?: boolean;
  onChange: (value: MaterialStatus) => void;
};

export default function MaterialButtons({ value, disabled, onChange }: MaterialButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {materialStatusOrder.map((status) => (
        <button
          key={status}
          type="button"
          disabled={disabled}
          onClick={() => onChange(status)}
          className={`min-h-12 rounded-lg border px-3 text-base font-black disabled:cursor-not-allowed disabled:opacity-60 ${
            value === status
              ? status === 'OK'
                ? 'border-green-500 bg-green-500 text-white'
                : status === 'LOW'
                  ? 'border-yellow-400 bg-yellow-300 text-slate-950'
                  : 'border-red-500 bg-red-500 text-white'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {materialStatusLabels[status]}
        </button>
      ))}
    </div>
  );
}
