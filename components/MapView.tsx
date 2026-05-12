'use client';

import { useState } from 'react';
import { appPath } from '@/lib/clientConfig';
import type { BoothWithStatus } from '@/lib/types';
import BoothCard from './BoothCard';

type MapViewProps = {
  booths: BoothWithStatus[];
};

export default function MapView({ booths }: MapViewProps) {
  const [imageMissing, setImageMissing] = useState(false);
  const [selectedBoothNo, setSelectedBoothNo] = useState<number | null>(null);
  const hasPins = booths.some((booth) => typeof booth.x === 'number' && typeof booth.y === 'number');
  const problemBooths = booths.filter((booth) => booth.problem);
  const selectedBooth = booths.find((booth) => booth.boothNo === selectedBoothNo);

  return (
    <section className="space-y-4">
      {!imageMissing ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative min-w-[760px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={appPath('/booth-map.png')}
              alt="부스배치도"
              className="h-auto w-full"
              onError={() => setImageMissing(true)}
            />
            {hasPins
              ? booths
                  .filter((booth) => typeof booth.x === 'number' && typeof booth.y === 'number')
                  .map((booth) => {
                    const selected = booth.boothNo === selectedBoothNo;
                    return (
                      <button
                        key={booth.boothNo}
                        type="button"
                        aria-label={`부스 ${booth.boothNo} ${booth.name} 보기`}
                        onClick={() => setSelectedBoothNo(booth.boothNo)}
                        className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-black text-white shadow-md ${
                          booth.problem ? 'bg-red-500' : selected ? 'bg-green-600' : 'bg-slate-900'
                        } ${selected ? 'ring-4 ring-green-300' : ''}`}
                        style={{ left: `${booth.x}%`, top: `${booth.y}%` }}
                      >
                        {booth.boothNo}
                      </button>
                    );
                  })
              : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-base font-black text-slate-600">
          부스배치도 이미지를 public/booth-map.png에 추가해주세요.
        </div>
      )}

      {!imageMissing && !hasPins ? (
        <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-600">
          좌표가 없어서 배치도 아래에 문제 부스를 표시합니다.
        </div>
      ) : null}

      {hasPins ? (
        <div className="rounded-lg bg-white p-3 text-sm font-bold text-slate-600">
          지도 번호를 누르면 해당 부스 정보를 볼 수 있습니다. 좁은 화면에서는 지도를 좌우로 움직여 주세요.
        </div>
      ) : null}

      {selectedBooth ? (
        <div className="space-y-3">
          <h2 className="text-lg font-black text-slate-950">선택 부스</h2>
          <BoothCard key={selectedBooth.boothNo} booth={selectedBooth} defaultExpanded />
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-lg font-black text-slate-950">문제 부스</h2>
        {problemBooths.length > 0 ? (
          problemBooths.map((booth) => <BoothCard key={booth.boothNo} booth={booth} />)
        ) : (
          <div className="rounded-lg bg-white p-4 text-sm font-bold text-slate-500">현재 문제 부스가 없습니다.</div>
        )}
      </div>
    </section>
  );
}
