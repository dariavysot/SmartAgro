import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, CheckCheck, Clock, Loader2, ArrowRight } from 'lucide-react';

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
  onDismissAll?: () => Promise<void> | void;
  onViewAll?: () => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onDismiss, onDismissAll, onViewAll }) => {
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [isResolvingAll, setIsResolvingAll] = useState(false);

  const handleResolveClick = async (id: number) => {
    setResolvingId(id);
    try {
      await onDismiss(id);
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAllClick = async () => {
    if (!onDismissAll || alerts.length === 0) return;
    setIsResolvingAll(true);
    try {
      await onDismissAll();
    } finally {
      setIsResolvingAll(false);
    }
  };

  // Показуємо лише топ-3 найсвіжіших сповіщень на дашборді
  const displayedAlerts = alerts.slice(0, 3);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-lg flex flex-col transition-colors">
      {/* Заголовок, лічильник та кнопка масового вирішення зверху */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Активні сповіщення</h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            {alerts.length}
          </span>
        </div>

        {alerts.length > 1 && onDismissAll && (
          <button
            disabled={isResolvingAll || resolvingId !== null}
            onClick={handleResolveAllClick}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/15 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/30 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isResolvingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Закриття...</span>
              </>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Вирішено всі</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Список тривог */}
      <div className="space-y-2.5 mb-4">
        {displayedAlerts.length === 0 ? (
          <div className="h-28 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
            <CheckCircle className="w-6 h-6 mb-2 text-emerald-500/50" />
            <span>Усі показники в межах норми. Аномалій немає.</span>
          </div>
        ) : (
          displayedAlerts.map((alert) => {
            const isCritical = alert.type.toLowerCase() === 'critical';

            return (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isCritical
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                    : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                }`}
              >
                <div className="space-y-1.5 pr-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Активно
                    </span>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {alert.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {alert.greenhouseName && (
                      <span>{alert.greenhouseName} •</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <button
                  disabled={resolvingId === alert.id || isResolvingAll}
                  onClick={() => handleResolveClick(alert.id)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-lg transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {resolvingId === alert.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Збереження...</span>
                    </>
                  ) : (
                    'Вирішено'
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Кнопка переходу в журнал праворуч унизу у єдиному стилі */}
      {onViewAll && (
        <div className="flex justify-end mt-auto pt-1">
          <button
            onClick={onViewAll}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-500/15 text-slate-700 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500/30 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 group"
          >
            <span>Переглянути весь журнал</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
};