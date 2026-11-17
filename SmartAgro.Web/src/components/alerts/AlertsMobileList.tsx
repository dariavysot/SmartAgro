import React from 'react';
import type { AlertLogRecord } from '../../pages/Alerts';

interface AlertsMobileListProps {
  alerts: AlertLogRecord[];
  onResolve: (id: number) => Promise<void> | void;
}

export const AlertsMobileList: React.FC<AlertsMobileListProps> = ({ alerts, onResolve }) => {
  return (
    <div className="md:hidden space-y-3">
      {alerts.length === 0 ? (
        <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          Жодної тривоги за заданими критеріями не знайдено.
        </div>
      ) : (
        alerts.map((item) => (
          <div key={item.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-400 dark:text-slate-500">#{item.id}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                item.severity.toLowerCase() === 'critical'
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
              }`}>
                {item.severity}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                <span>{item.greenhouseName}</span>
              </div>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {item.message}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                {new Date(item.createdAt).toLocaleString([], {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  item.isResolved 
                    ? 'text-emerald-700 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400 animate-pulse'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.isResolved ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                  {item.isResolved ? 'Вирішено' : 'Активно'}
                </span>

                {!item.isResolved && (
                  <button
                    onClick={() => onResolve(item.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    Вирішити
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};