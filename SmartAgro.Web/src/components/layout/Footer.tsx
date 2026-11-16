import React from 'react';
import { Sprout } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 shrink-0 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Sprout className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200">SmartAgro IoT Greenhouse OS</span>
          <span className="hidden md:inline">— Система інтелектуального моніторингу та прогнозування</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="tabular-nums">© {new Date().getFullYear()} Усі права захищені</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 hidden sm:inline" />
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Faculty of IT KNU</span>
        </div>
      </div>
    </footer>
  );
};