import type { BoothWithStatus } from '@/lib/types';

type SummaryCardsProps = {
  booths: BoothWithStatus[];
};

export default function SummaryCards({ booths }: SummaryCardsProps) {
  const summary = [
    {
      label: '전체',
      value: booths.length,
      hint: '등록 부스',
      color: '#0060b0'
    },
    {
      label: '운영중',
      value: booths.filter((booth) => booth.status.operationStatus === 'OPEN').length,
      hint: `${booths.length}개 중`,
      color: '#16a34a'
    },
    {
      label: '혼잡',
      value: booths.filter((booth) => booth.status.congestionLevel >= 3).length,
      hint: '혼잡 이상',
      color: '#f97316',
      urgent: true
    },
    {
      label: '도움요청',
      value: booths.filter((booth) => booth.status.helpRequested).length,
      hint: 'HQ 처리',
      color: '#ef4444',
      urgent: true
    },
    {
      label: '마감',
      value: booths.filter((booth) => booth.status.operationStatus === 'CLOSED').length,
      hint: '종료 부스',
      color: '#64748b'
    }
  ];

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
      {summary.map((item) => (
        <div
          key={item.label}
          className={`relative overflow-hidden rounded-lg border p-3 shadow-sm sm:p-4 ${
            item.urgent && item.value > 0 ? 'border-red-200 bg-red-50' : 'border-[var(--line)] bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: item.color }} />
          <div className="text-sm font-black text-slate-500">{item.label}</div>
          <div className="mt-1">
            <div className="text-3xl font-black leading-none text-slate-950 sm:text-4xl" style={{ color: item.color }}>
              {item.value}
            </div>
            <div className="mt-1 text-xs font-black text-slate-500">{item.hint}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
