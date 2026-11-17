import React from 'react';
import type { AlertLogRecord } from '../../pages/Alerts';

interface AlertsTableProps {
  alerts: AlertLogRecord[];
  onResolve: (id: number) => Promise<void> | void;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({ alerts, onResolve }) => {
  return (
    <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
            <tr>
              <th className="py-3.5 px-4">ID</th>
              <th className="py-3.5 px-4">Час фіксації</th>
              <th className="py-3.5 px-4">Теплиця</th>
              <th className="py-3.5 px-4">Повідомлення</th>
              <th className="py-3.5 px-4">Рівень</th>
              <th className="py-3.5 px-4">Стан</th>
              <th className="py-3.5 px-4 text-right">Дія</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {alerts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                  Жодної тривоги за заданими критеріями не знайдено.
                </td>
              </tr>
            ) : (
              alerts.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-400 dark:text-slate-500">#{item.id}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString([], {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 dark:text-emerald-400 font-semibold">{item.greenhouseName}</td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 dark:text-slate-200 font-medium">{item.message}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      item.severity.toLowerCase() === 'critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                    }`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${
                      item.isResolved 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400 animate-pulse'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isResolved ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                      {item.isResolved ? 'Вирішено' : 'Активно'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {!item.isResolved ? (
                      <button
                        onClick={() => onResolve(item.id)}
                        className="px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        Вирішити
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Закрито</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};