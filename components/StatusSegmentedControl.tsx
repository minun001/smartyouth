'use client';

import { operationStatusLabels, operationStatusOrder } from '@/lib/statusLabels';
import type { OperationStatus } from '@/lib/types';

type StatusSegmentedControlProps = {
  value: OperationStatus;
  disabled?: boolean;
  onChange: (value: OperationStatus) => void;
};

export default function StatusSegmentedControl({ value, disabled, onChange }: StatusSegmentedControlProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {operationStatusOrder.map((status) => {
        const active = value === status;
        const activeClass =
          status === 'OPEN'
            ? 'border-[var(--asan-green)] bg-[var(--asan-green)] text-white'
            : status === 'PAUSED'
              ? 'border-orange-500 bg-orange-500 text-white'
              : status === 'CLOSED'
                ? 'border-slate-700 bg-slate-700 text-white'
                : 'border-[var(--asan-blue)] bg-[var(--asan-blue)] text-white';
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            className={`min-h-14 rounded-lg border px-3 text-base font-black disabled:cursor-not-allowed disabled:opacity-60 ${
              active ? activeClass : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {operationStatusLabels[status]}
          </button>
        );
      })}
    </div>
  );
}
