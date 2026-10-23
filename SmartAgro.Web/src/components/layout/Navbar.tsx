import React from 'react';
import { Sun, Moon, Radio, LogOut } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { GreenhouseSelector } from './GreenhouseSelector';

interface NavbarProps {
  isStreaming?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isStreaming = true }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const roleLabel = user?.role === 'Admin' ? 'Адміністратор' : 'Користувач';

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 transition-colors gap-2 overflow-hidden">
      {/* Ліва частина: статус SignalR + Селектор теплиці */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs shrink-0"
          title={isStreaming ? 'SignalR: Підключено' : 'SignalR: Відключено'}
        >
          <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`} />
          <span className="text-slate-700 dark:text-slate-300 hidden md:inline font-medium">
            {isStreaming ? 'SignalR: Підключено' : 'Відключено'}
          </span>
        </div>

        {/* Обмежувач ширини для випадаючого списку теплиць */}
        <div className="min-w-0 max-w-[260px] sm:max-w-[340px] md:max-w-md lg:max-w-lg">
          <GreenhouseSelector />
        </div>
      </div>

      {/* Права частина: Перемикач теми + Інформація про користувача + Кнопка виходу */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Блок користувача: відображається лише на просторих екранах (>= lg) */}
        <div className="hidden lg:flex flex-col text-right pl-3 border-l border-slate-200 dark:border-slate-800 max-w-[140px]">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={user?.username || user?.email}>
            {user?.username || user?.email}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {roleLabel}
          </span>
        </div>

        {/* Кнопка виходу: іконка завжди, текст лише на середніх+ екранах */}
        <button
          onClick={logout}
          title="Вийти з облікового запису"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Вийти</span>
        </button>
      </div>
    </header>
  );
};