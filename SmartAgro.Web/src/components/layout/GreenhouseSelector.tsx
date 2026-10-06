import React from 'react';
import { useGreenhouse } from '../../context/GreenhouseContext';

export const GreenhouseSelector: React.FC = () => {
  const { greenhouses, selectedGreenhouse, setSelectedGreenhouseId, isLoading } = useGreenhouse();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        Завантаження теплиць...
      </div>
    );
  }

  if (greenhouses.length === 0) {
    return (
      <div className="text-xs text-amber-400 font-medium bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
        Немає підключених об'єктів
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
        Теплиця:
      </span>
      <select
        value={selectedGreenhouse?.id || ''}
        onChange={(e) => setSelectedGreenhouseId(e.target.value)}
        className="bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-slate-100 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer font-medium"
      >
        {greenhouses.map((gh) => (
          <option key={gh.id} value={gh.id} className="bg-slate-900 text-slate-100">
            {gh.name} {gh.location ? `(${gh.location})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};