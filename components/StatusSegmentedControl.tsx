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
      {operationStatusOrder.map((status) => (
        <button
          key={status}
          type="button"
          disabled={disabled}
          onClick={() => onChange(status)}
          className={`min-h-12 rounded-lg border px-3 text-base font-black disabled:cursor-not-allowed disabled:opacity-60 ${
            value === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {operationStatusLabels[status]}
        </button>
      ))}
    </div>
  );
}
