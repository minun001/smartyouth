'use client';

import { helpTypeLabels, helpTypeOrder } from '@/lib/statusLabels';
import type { HelpType } from '@/lib/types';

type HelpRequestButtonsProps = {
  activeType?: HelpType;
  disabled?: boolean;
  onRequest: (type: HelpType) => void;
};

export default function HelpRequestButtons({ activeType, disabled, onRequest }: HelpRequestButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {helpTypeOrder.map((type) => (
        <button
          key={type}
          type="button"
          disabled={disabled}
          onClick={() => onRequest(type)}
          className={`min-h-14 rounded-lg border px-3 text-base font-black disabled:cursor-not-allowed disabled:opacity-60 ${
            activeType === type ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {helpTypeLabels[type]}
        </button>
      ))}
    </div>
  );
}
