'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  isPushSupported,
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushStatus,
} from '@/app/lib/pushUtils';

interface PushToggleProps {
  /** Estilo compacto (só ícone + texto curto) */
  compact?: boolean;
  /** Callback após mudança de status */
  onStatusChange?: (status: PushStatus) => void;
}

export default function PushToggle({ compact = false, onStatusChange }: PushToggleProps) {
  const [status, setStatus] = useState<PushStatus>('default');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getPushStatus().then((s) => {
      setStatus(s);
      onStatusChange?.(s);
    });
  }, []);

  const handleToggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (status === 'subscribed') {
        const ok = await unsubscribeFromPush();
        const newStatus: PushStatus = ok ? 'unsubscribed' : 'subscribed';
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      } else {
        const ok = await subscribeToPush();
        const newStatus: PushStatus = ok ? 'subscribed' : status;
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    } finally {
      setLoading(false);
    }
  }, [status, loading, onStatusChange]);

  if (!mounted) return null;
  if (status === 'unsupported') return null;

  const isSubscribed = status === 'subscribed';
  const isDenied = status === 'denied';

  const label = loading
    ? 'Aguarde…'
    : isSubscribed
    ? 'Notificações ativas'
    : isDenied
    ? 'Notificações bloqueadas'
    : 'Ativar notificações';

  const icon = isSubscribed ? '🔔' : isDenied ? '🔕' : '🔔';

  return (
    <button
      onClick={isDenied ? undefined : handleToggle}
      disabled={loading || isDenied}
      title={isDenied ? 'Desbloqueie as notificações nas configurações do browser' : label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '8px',
        padding: compact ? '6px 10px' : '8px 16px',
        borderRadius: '10px',
        border: `1px solid ${isSubscribed ? 'rgba(197,160,89,0.5)' : 'rgba(255,255,255,0.15)'}`,
        background: isSubscribed
          ? 'rgba(197,160,89,0.15)'
          : 'rgba(255,255,255,0.05)',
        color: isSubscribed ? '#c5a059' : isDenied ? '#666' : '#aaa',
        cursor: isDenied ? 'not-allowed' : 'pointer',
        fontSize: compact ? '12px' : '13px',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
        opacity: loading ? 0.6 : 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer animado enquanto carrega */}
      {loading && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(197,160,89,0.2), transparent)',
            animation: 'push-shimmer 1.2s infinite',
          }}
        />
      )}

      <style>{`
        @keyframes push-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .push-toggle-btn:hover:not(:disabled) {
          border-color: rgba(197,160,89,0.4) !important;
          background: rgba(197,160,89,0.1) !important;
        }
      `}</style>

      <span style={{ fontSize: compact ? '14px' : '16px' }}>{icon}</span>
      {!compact && (
        <span style={{ fontWeight: 500, letterSpacing: '0.02em' }}>{label}</span>
      )}

      {/* Indicador de status ativo */}
      {isSubscribed && !loading && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#4ade80',
            animation: 'push-pulse 2s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      <style>{`
        @keyframes push-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </button>
  );
}
