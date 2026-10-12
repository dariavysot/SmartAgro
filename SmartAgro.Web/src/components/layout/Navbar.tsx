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
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
      {/* Ліва частина: статус SignalR + Селектор теплиці */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="text-slate-300 hidden md:inline">
            {isStreaming ? 'SignalR: Підключено' : 'SignalR: Відключено'}
          </span>
        </div>

        <GreenhouseSelector />
      </div>

      {/* Права частина: Перемикач теми + Інформація про користувача + Кнопка виходу */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Змінити тему"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Блок користувача */}
        <div className="hidden sm:flex flex-col text-right pl-3 border-l border-slate-800">
          <span className="text-xs font-medium text-slate-200">
            {user?.username || user?.email}
          </span>
          <span className="text-[10px] text-slate-400">
            {roleLabel}
          </span>
        </div>

        {/* Кнопка виходу */}
        <button
          onClick={logout}
          title="Вийти з облікового запису"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Вийти</span>
        </button>
      </div>
    </header>
  );
};