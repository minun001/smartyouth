import type { BoothWithStatus } from '@/lib/types';
import { congestionStatusColor, operationStatusColor, operationStatusLabels } from '@/lib/statusLabels';

type SummaryCardsProps = {
  booths: BoothWithStatus[];
};

export default function SummaryCards({ booths }: SummaryCardsProps) {
  const summary = [
    {
      label: operationStatusLabels.READY,
      value: booths.filter((booth) => booth.status.operationStatus === 'READY').length,
      hint: '운영 전',
      color: operationStatusColor('READY')
    },
    {
      label: operationStatusLabels.OPEN,
      value: booths.filter((booth) => booth.status.operationStatus === 'OPEN').length,
      hint: '현재 운영',
      color: operationStatusColor('OPEN')
    },
    {
      label: operationStatusLabels.PAUSED,
      value: booths.filter((booth) => booth.status.operationStatus === 'PAUSED').length,
      hint: '확인 필요',
      color: operationStatusColor('PAUSED'),
      urgent: true
    },
    {
      label: operationStatusLabels.CLOSED,
      value: booths.filter((booth) => booth.status.operationStatus === 'CLOSED').length,
      hint: '종료 부스',
      color: operationStatusColor('CLOSED')
    },
    {
      label: '혼잡',
      value: booths.filter((booth) => booth.status.congestionLevel >= 3).length,
      hint: '혼잡 상태',
      color: congestionStatusColor(3),
      urgent: true
    }
  ];

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
      {summary.map((item) => (
        <div
          key={item.label}
          className={`relative overflow-hidden rounded-lg border p-3 shadow-sm sm:p-4 ${
            item.urgent && item.value > 0 ? 'border-orange-200 bg-orange-50' : 'border-[var(--line)] bg-white'
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
