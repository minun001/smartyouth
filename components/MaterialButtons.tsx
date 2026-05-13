'use client';

import { materialStatusLabels, materialStatusOrder } from '@/lib/statusLabels';
import type { MaterialStatus } from '@/lib/types';

type MaterialButtonsProps = {
  value: MaterialStatus;
  disabled?: boolean;
  onChange: (value: MaterialStatus) => void;
};

const materialColor: Record<MaterialStatus, string> = {
  OK: 'border-[var(--asan-green)] bg-[var(--asan-green)] text-white',
  LOW: 'border-orange-500 bg-orange-500 text-white',
  OUT: 'border-red-600 bg-red-600 text-white'
};

export default function MaterialButtons({ value, disabled, onChange }: MaterialButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {materialStatusOrder.map((status) => {
        const active = value === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`min-h-14 rounded-lg border px-3 text-base font-black disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? materialColor[status] : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {materialStatusLabels[status]}
          </button>
        );
      })}
    </div>
  );
}
