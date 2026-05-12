'use client';

import type { BoothStatus } from '@/lib/types';

const waitOptions: BoothStatus['waitMinutes'][] = [0, 5, 10, 20, 30];

type WaitTimeButtonsProps = {
  value: BoothStatus['waitMinutes'];
  disabled?: boolean;
  onChange: (value: BoothStatus['waitMinutes']) => void;
};

export default function WaitTimeButtons({ value, disabled, onChange }: WaitTimeButtonsProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {waitOptions.map((minutes) => (
        <button
          key={minutes}
          type="button"
          disabled={disabled}
          onClick={() => onChange(minutes)}
          className={`min-h-14 rounded-lg border px-1 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 ${
            value === minutes ? 'border-[var(--asan-blue)] bg-[var(--asan-blue)] text-white' : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          {minutes === 30 ? '30분+' : `${minutes}분`}
        </button>
      ))}
    </div>
  );
}
