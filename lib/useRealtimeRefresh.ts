'use client';

import { useEffect } from 'react';
import { isStaticDemo, realtimeUrl } from './clientConfig';
import { REALTIME_FALLBACK_REFRESH_INTERVAL_MS } from './realtimeConfig';

type RealtimeRefreshOptions = {
  enabled?: boolean;
  onRefresh: () => void | Promise<void>;
  fallbackMs?: number;
};

const REFRESH_EVENT_TYPES = new Set(['status_changed', 'help_created', 'incident_changed', 'help_reset']);

export function useRealtimeRefresh({
  enabled = true,
  onRefresh,
  fallbackMs = REALTIME_FALLBACK_REFRESH_INTERVAL_MS
}: RealtimeRefreshOptions) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    let closed = false;
    let fallbackId: number | undefined;
    let socket: WebSocket | undefined;

    const refresh = () => {
      void onRefresh();
    };

    const startFallback = () => {
      if (closed || fallbackId) return;
      fallbackId = window.setInterval(refresh, fallbackMs);
    };

    if (!isStaticDemo && realtimeUrl && 'WebSocket' in window) {
      try {
        socket = new WebSocket(realtimeUrl);
        const openTimeout = window.setTimeout(() => {
          if (socket?.readyState !== WebSocket.OPEN) startFallback();
        }, 4000);

        socket.addEventListener('open', () => {
          window.clearTimeout(openTimeout);
          if (fallbackId) {
            window.clearInterval(fallbackId);
            fallbackId = undefined;
          }
        });

        socket.addEventListener('message', (event) => {
          try {
            const message = JSON.parse(String(event.data)) as { type?: string };
            if (message.type && REFRESH_EVENT_TYPES.has(message.type)) refresh();
          } catch {
            // Ignore keepalive or malformed realtime messages.
          }
        });

        socket.addEventListener('close', startFallback);
        socket.addEventListener('error', startFallback);
      } catch {
        startFallback();
      }
    } else {
      startFallback();
    }

    return () => {
      closed = true;
      if (fallbackId) window.clearInterval(fallbackId);
      socket?.close();
    };
  }, [enabled, fallbackMs, onRefresh]);
}
