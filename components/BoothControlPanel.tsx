'use client';

import { useEffect, useState } from 'react';
import { apiPath, isStaticDemo } from '@/lib/clientConfig';
import { patchStaticStatus } from '@/lib/staticDemoClient';
import { formatTime } from '@/lib/statusLabels';
import type { BoothStatus, BoothWithStatus, StatusPatch } from '@/lib/types';
import CongestionSlider from './CongestionSlider';
import MaterialButtons from './MaterialButtons';
import StatusSegmentedControl from './StatusSegmentedControl';
import WaitTimeButtons from './WaitTimeButtons';

type BoothControlPanelProps = {
  booth: BoothWithStatus;
  token?: string | null;
  canEdit: boolean;
  variant?: 'panel' | 'inline';
  onClose?: () => void;
  onUpdated?: (status: BoothStatus) => void;
  onSaved?: () => void;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function BoothControlPanel({
  booth,
  token,
  canEdit,
  variant = 'panel',
  onClose,
  onUpdated,
  onSaved
}: BoothControlPanelProps) {
  const [status, setStatus] = useState(booth.status);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    setStatus(booth.status);
  }, [booth.boothNo, booth.status.updatedAt]);

  const tokenQuery = token ? `?t=${encodeURIComponent(token)}` : '';

  async function patchStatus(patch: StatusPatch) {
    if (!canEdit) return;

    const previous = status;
    const optimistic = { ...status, ...patch, updatedAt: new Date().toISOString() };
    setStatus(optimistic);
    onUpdated?.(optimistic);
    setSaveState('saving');

    if (isStaticDemo) {
      try {
        const data = await patchStaticStatus(booth.boothNo, token, patch);
        setStatus(data.status);
        setSaveState('saved');
        setSavedAt(data.savedAt);
        onUpdated?.(data.status);
        onSaved?.();
      } catch {
        setStatus(previous);
        onUpdated?.(previous);
        setSaveState('error');
      }
      return;
    }

    const response = await fetch(`${apiPath(`/api/booths/${booth.boothNo}/status`)}${tokenQuery}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });

    if (!response.ok) {
      setStatus(previous);
      onUpdated?.(previous);
      setSaveState('error');
      return;
    }

    const data = (await response.json()) as { status: BoothStatus; savedAt: string };
    setStatus(data.status);
    setSaveState('saved');
    setSavedAt(data.savedAt);
    onUpdated?.(data.status);
    onSaved?.();
  }

  function patchWaitMinutes(waitMinutes: BoothStatus['waitMinutes']) {
    const patch: StatusPatch = { waitMinutes };
    if (waitMinutes >= 10) {
      patch.congestionLevel = 3;
    }
    void patchStatus(patch);
  }

  const saveStatusClass =
    saveState === 'error'
      ? 'bg-red-500 text-white'
      : saveState === 'saved'
        ? 'bg-[var(--asan-yellow)] text-slate-950'
        : 'bg-white/15 text-white';
  const saveStatusText =
    saveState === 'saving'
      ? '저장중'
      : saveState === 'saved'
        ? `저장됨 · ${formatTime(savedAt)}`
        : saveState === 'error'
          ? '저장 실패. 다시 시도해주세요.'
          : `마지막 업데이트 · ${formatTime(status.updatedAt)}`;

  const controls = (
    <div className="space-y-5">
      <ControlBlock title="운영 상태">
        <StatusSegmentedControl
          value={status.operationStatus}
          disabled={!canEdit}
          onChange={(operationStatus) => void patchStatus({ operationStatus })}
        />
      </ControlBlock>

      <ControlBlock title="혼잡도">
        <CongestionSlider
          value={status.congestionLevel}
          disabled={!canEdit}
          onChange={(congestionLevel) => void patchStatus({ congestionLevel })}
        />
      </ControlBlock>

      <ControlBlock title="대기시간">
        <WaitTimeButtons
          value={status.waitMinutes}
          disabled={!canEdit}
          onChange={patchWaitMinutes}
        />
      </ControlBlock>

      <ControlBlock title="재료 상태">
        <MaterialButtons
          value={status.materialStatus}
          disabled={!canEdit}
          onChange={(materialStatus) => void patchStatus({ materialStatus })}
        />
      </ControlBlock>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-white p-3 shadow-sm">
        {saveState !== 'idle' ? (
          <div className={`mb-3 rounded-lg px-3 py-2 text-sm font-black ${saveStatusClass}`}>{saveStatusText}</div>
        ) : null}

        {!canEdit ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
            상황을 불러오는 중입니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : null}

        {controls}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_18px_48px_rgba(0,96,176,0.14)]">
      <div className="bg-gradient-to-r from-[var(--asan-blue)] via-[var(--asan-sky)] to-[var(--asan-green)] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-black text-[var(--asan-yellow)]">부스 {booth.boothNo}</div>
            <h1 className="mt-1 text-2xl font-black leading-tight">{booth.name}</h1>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 shrink-0 rounded-lg bg-white/10 px-4 text-sm font-black text-white"
            >
              닫기
            </button>
          ) : null}
        </div>

        <div className={`mt-4 rounded-lg px-3 py-2 text-sm font-black ${saveStatusClass}`}>{saveStatusText}</div>
      </div>

      <div className="p-4">
        {!canEdit ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
            상황을 불러오는 중입니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : null}

        {controls}
      </div>
    </section>
  );
}

function ControlBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-base font-black text-slate-900">{title}</div>
      {children}
    </div>
  );
}
