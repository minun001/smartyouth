'use client';

import type { BoothStatus } from '@/lib/types';
import { isLongWaitMinutes, waitMinutesLabel } from '@/lib/statusLabels';

type WaitMinutes = BoothStatus['waitMinutes'];

type WaitTimeButtonsProps = {
  value: WaitMinutes;
  disabled?: boolean;
  onChange: (value: WaitMinutes) => void;
};

const waitOptions: WaitMinutes[] = [0, 5, 10, 20, 30];

export default function WaitTimeButtons({ value, disabled, onChange }: WaitTimeButtonsProps) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {waitOptions.map((option) => {
          const active = value === option;
          const longWait = isLongWaitMinutes(option);
          const activeClass = longWait
            ? 'border-red-600 bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-sm'
            : 'border-[var(--asan-blue)] bg-[var(--asan-blue)] text-white';
          const inactiveClass = longWait
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-slate-200 bg-white text-slate-700';

          return (
            <button
              key={option}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              className={`min-h-12 rounded-lg border px-1 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? activeClass : inactiveClass
              }`}
            >
              {waitMinutesLabel(option)}
            </button>
          );
        })}
      </div>
      <div
        className={`mt-2 rounded-lg px-3 py-2 text-xs font-black ${
          isLongWaitMinutes(value)
            ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white'
            : 'bg-slate-50 text-slate-600'
        }`}
      >
        10분 이상 선택 시 자동으로 혼잡 표시
      </div>
    </div>
  );
}
