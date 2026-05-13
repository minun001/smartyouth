'use client';

import type { BoothStatus } from '@/lib/types';

type WaitMinutes = BoothStatus['waitMinutes'];

type WaitTimeButtonsProps = {
  value: WaitMinutes;
  disabled?: boolean;
  onChange: (value: WaitMinutes) => void;
};

const waitOptions: WaitMinutes[] = [0, 5, 10, 20, 30];

function waitLabel(value: WaitMinutes) {
  return value === 30 ? '30분+' : `${value}분`;
}

export default function WaitTimeButtons({ value, disabled, onChange }: WaitTimeButtonsProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {waitOptions.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`min-h-12 rounded-lg border px-1 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? 'border-[var(--asan-blue)] bg-[var(--asan-blue)] text-white'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {waitLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
