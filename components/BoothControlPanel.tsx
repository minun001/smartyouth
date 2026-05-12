'use client';

import { useEffect, useState } from 'react';
import { appPath, isStaticDemo } from '@/lib/clientConfig';
import { createStaticHelp, patchStaticStatus } from '@/lib/staticDemoClient';
import { formatTime } from '@/lib/statusLabels';
import type { BoothStatus, BoothWithStatus, HelpType, StatusPatch } from '@/lib/types';
import CongestionSlider from './CongestionSlider';
import HelpRequestButtons from './HelpRequestButtons';
import StatusSegmentedControl from './StatusSegmentedControl';

type BoothControlPanelProps = {
  booth: BoothWithStatus;
  token?: string | null;
  canEdit: boolean;
  onClose?: () => void;
  onUpdated?: (status: BoothStatus) => void;
  onSaved?: () => void;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function BoothControlPanel({
  booth,
  token,
  canEdit,
  onClose,
  onUpdated,
  onSaved
}: BoothControlPanelProps) {
  const [status, setStatus] = useState(booth.status);
  const [memo, setMemo] = useState(booth.status.memo ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    setStatus(booth.status);
    setMemo(booth.status.memo ?? '');
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

    const response = await fetch(`${appPath(`/api/booths/${booth.boothNo}/status`)}${tokenQuery}`, {
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

  async function requestHelp(type: HelpType) {
    if (!canEdit) return;

    const next = {
      ...status,
      helpRequested: true,
      helpType: type,
      memo: memo.trim() || status.memo,
      updatedAt: new Date().toISOString()
    };
    setStatus(next);
    onUpdated?.(next);
    setSaveState('saving');

    if (isStaticDemo) {
      try {
        await createStaticHelp(booth.boothNo, token, type, memo);
        setSaveState('saved');
        setSavedAt(new Date().toISOString());
        window.dispatchEvent(new CustomEvent('smartyouth-help-created'));
        onSaved?.();
      } catch {
        setSaveState('error');
      }
      return;
    }

    const response = await fetch(`${appPath(`/api/booths/${booth.boothNo}/help`)}${tokenQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, memo })
    });

    if (!response.ok) {
      setSaveState('error');
      return;
    }

    setSaveState('saved');
    setSavedAt(new Date().toISOString());
    window.dispatchEvent(new CustomEvent('smartyouth-help-created'));
    onSaved?.();
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

        <div
          className={`mt-4 rounded-lg px-3 py-2 text-sm font-black ${
            saveState === 'error'
              ? 'bg-red-500 text-white'
              : saveState === 'saved'
                ? 'bg-[var(--asan-yellow)] text-slate-950'
                : 'bg-white/15 text-white'
          }`}
        >
          {saveState === 'saving' ? '저장중' : null}
          {saveState === 'saved' ? `저장됨 · ${formatTime(savedAt)}` : null}
          {saveState === 'error' ? '저장 실패. 다시 시도해주세요.' : null}
          {saveState === 'idle' ? `마지막 업데이트 · ${formatTime(status.updatedAt)}` : null}
        </div>
      </div>

      <div className="p-4">
        {!canEdit ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
            수정 권한이 없는 링크입니다. 부스 QR을 다시 확인해주세요.
          </div>
        ) : null}

        {status.helpRequested ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">
            도움 요청이 접수된 상태입니다. 해결 후 HQ 도움 요청 화면에서 완료 처리해주세요.
          </div>
        ) : null}

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

          <ControlBlock title="도움 요청">
            <HelpRequestButtons activeType={status.helpType} disabled={!canEdit} onRequest={(type) => void requestHelp(type)} />
          </ControlBlock>

          <ControlBlock title="메모">
            <textarea
              value={memo}
              disabled={!canEdit}
              onChange={(event) => setMemo(event.target.value)}
              onBlur={() => {
                if (memo !== (status.memo ?? '')) void patchStatus({ memo });
              }}
              rows={3}
              maxLength={300}
              placeholder="짧게 입력"
              className="min-h-24 w-full rounded-lg border-slate-200 text-base font-semibold text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
            />
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => void patchStatus({ memo })}
              className="mt-2 min-h-12 w-full rounded-lg bg-gradient-to-r from-[var(--asan-blue)] to-[var(--asan-sky)] text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              메모 저장
            </button>
          </ControlBlock>
        </div>
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
