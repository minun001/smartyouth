'use client';

import { operationStatusColor, operationStatusLabels, operationStatusOrder } from '@/lib/statusLabels';
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
        const color = operationStatusColor(status);
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            onClick={() => onChange(status)}
            className="min-h-14 rounded-lg border px-3 text-base font-black disabled:cursor-not-allowed disabled:opacity-60"
            style={
              active
                ? { borderColor: color, backgroundColor: color, color: '#ffffff' }
                : { borderColor: '#e2e8f0', backgroundColor: '#ffffff', color }
            }
          >
            {operationStatusLabels[status]}
          </button>
        );
      })}
    </div>
  );
}
