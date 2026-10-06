import React from 'react';
import { Sun, Moon, Radio, User as UserIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useGreenhouse } from '../../context/GreenhouseContext';
import { GreenhouseSelector } from './GreenhouseSelector';

interface NavbarProps {
  isStreaming?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ isStreaming = true }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { selectedGreenhouse } = useGreenhouse();

  const roleLabel = user?.role === 'Admin' ? 'Адміністратор' : 'Користувач';

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
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

      {/* Права частина: Перемикач теми + Профіль користувача */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          title="Змінити тему"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-200">
              {user?.username || roleLabel}
            </p>
            <p className="text-[10px] text-slate-400">
              {selectedGreenhouse?.location ? `Локація: ${selectedGreenhouse.location}` : roleLabel}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};