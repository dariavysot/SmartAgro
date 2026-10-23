import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';

export interface AlertItem {
  id: number;
  message: string;
  type: 'Warning' | 'Critical' | string;
  timestamp: string;
  greenhouseName?: string;
}

interface AlertsPanelProps {
  alerts: AlertItem[];
  onDismiss: (id: number) => Promise<void> | void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onDismiss }) => {
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const handleResolveClick = async (id: number) => {
    setResolvingId(id);
    try {
      await onDismiss(id);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-white">Активні сповіщення</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
          {alerts.length}
        </span>
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-56 pr-1">
        {alerts.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-500 text-xs">
            <CheckCircle className="w-6 h-6 mb-2 text-emerald-500/40" />
            <span>Усі показники в межах норми. Аномалій немає.</span>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                alert.type.toLowerCase() === 'critical'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="space-y-1.5 pr-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                    Активно
                  </span>
                  <p className="text-xs font-medium text-slate-200">{alert.message}</p>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  {alert.greenhouseName && (
                    <span>{alert.greenhouseName} •</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {new Date(alert.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <button
                disabled={resolvingId === alert.id}
                onClick={() => handleResolveClick(alert.id)}
                className="px-2.5 py-1 text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {resolvingId === alert.id ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Збереження...</span>
                  </>
                ) : (
                  'Вирішити'
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};