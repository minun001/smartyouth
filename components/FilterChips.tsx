'use client';

import { filterLabels, filterOrder } from '@/lib/statusLabels';
import type { DashboardFilter } from '@/lib/types';

type FilterChipsProps = {
  active: DashboardFilter;
  onChange: (filter: DashboardFilter) => void;
};

export default function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto rounded-lg border border-[var(--line)] bg-white p-2 shadow-sm">
      {filterOrder.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`min-h-11 shrink-0 scroll-ml-3 rounded-md px-4 text-sm font-black transition ${
            active === filter
              ? 'bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] text-white shadow-sm'
              : 'bg-slate-50 text-slate-700 active:bg-slate-100'
          }`}
        >
          {filterLabels[filter]}
        </button>
      ))}
      <span className="w-1 shrink-0" aria-hidden="true" />
    </div>
  );
}
