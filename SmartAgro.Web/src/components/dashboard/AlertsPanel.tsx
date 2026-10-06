import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export interface AlertItem {
  id: string;
  message: string;
  type: 'Warning' | 'Critical';
  timestamp: string;
}

interface AlertsPanelProps {
  alerts: AlertItem[];
  onDismiss: (id: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onDismiss }) => {
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
                alert.type === 'Critical'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="space-y-1 pr-3">
                <p className="text-xs font-medium text-slate-200">{alert.message}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{alert.timestamp}</span>
                </div>
              </div>
              <button
                onClick={() => onDismiss(alert.id)}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-600 transition-colors cursor-pointer shrink-0"
              >
                Вирішено
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};