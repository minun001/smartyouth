import type { BoothWithStatus } from '@/lib/types';

type SummaryCardsProps = {
  booths: BoothWithStatus[];
};

export default function SummaryCards({ booths }: SummaryCardsProps) {
  const summary = [
    { label: '운영중', value: booths.filter((booth) => booth.status.operationStatus === 'OPEN').length, color: '#22c55e' },
    { label: '혼잡', value: booths.filter((booth) => booth.status.congestionLevel >= 3).length, color: '#f97316' },
    { label: '도움요청', value: booths.filter((booth) => booth.status.helpRequested).length, color: '#ef4444' },
    { label: '마감', value: booths.filter((booth) => booth.status.operationStatus === 'CLOSED').length, color: '#64748b' }
  ];

  return (
    <section className="grid grid-cols-2 gap-3">
      {summary.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-extrabold text-slate-500">{item.label}</div>
          <div className="mt-1 text-3xl font-black text-slate-950" style={{ color: item.color }}>
            {item.value}
          </div>
        </div>
      ))}
    </section>
  );
}
