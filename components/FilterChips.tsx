'use client';

import { filterLabels, filterOrder } from '@/lib/statusLabels';
import type { DashboardFilter } from '@/lib/types';

type FilterChipsProps = {
  active: DashboardFilter;
  onChange: (filter: DashboardFilter) => void;
};

export default function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {filterOrder.map((filter) => (
        <button
          key={filter}
          type="button"
          onClick={() => onChange(filter)}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-black ${
            active === filter ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
          }`}
        >
          {filterLabels[filter]}
        </button>
      ))}
    </div>
  );
}
