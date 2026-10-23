import React from 'react';
import { useGreenhouse } from '../../context/GreenhouseContext';

export const GreenhouseSelector: React.FC = () => {
  const { greenhouses, selectedGreenhouse, setSelectedGreenhouseId, isLoading } = useGreenhouse();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/50">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="hidden sm:inline">Завантаження...</span>
      </div>
    );
  }

  if (greenhouses.length === 0) {
    return (
      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/20 truncate">
        Немає об'єктів
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {/* Підпис з'являється лише на дуже широких моніторах, щоб не з'їдати простір шапки */}
      <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xl:inline shrink-0">
        Теплиця:
      </span>
      <select
        value={selectedGreenhouse?.id || ''}
        onChange={(e) => setSelectedGreenhouseId(e.target.value)}
        className="w-full truncate bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer font-medium"
      >
        {greenhouses.map((gh) => (
          <option
            key={gh.id}
            value={gh.id}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 py-1"
          >
            {gh.name} {gh.location ? `(${gh.location})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};