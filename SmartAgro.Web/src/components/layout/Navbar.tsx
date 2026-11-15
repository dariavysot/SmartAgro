import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Radio, LogOut, Bell, AlertTriangle, Clock, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { GreenhouseSelector } from './GreenhouseSelector';

export interface GlobalAlertItem {
  id: number;
  greenhouseId: string;
  greenhouseName?: string;
  message: string;
  severity: string;
  timestamp: string;
}

interface NavbarProps {
  isStreaming?: boolean;
  globalAlerts?: GlobalAlertItem[];
  onSelectAlert?: (greenhouseId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  isStreaming = true, 
  globalAlerts = [], 
  onSelectAlert 
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleLabel = user?.role === 'Admin' ? 'Адміністратор' : 'Користувач';

  // Закриття dropdown при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex items-center justify-between shrink-0 transition-colors gap-2 overflow-visible relative">
      {/* Ліва частина: статус SignalR + Селектор теплиці */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div 
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs shrink-0"
          title={isStreaming ? 'З’єднання в реальному часі активне (SignalR WebSocket)' : 'Втрачено зв’язок із сервером телеметрії'}
        >
          <Radio className={`w-3.5 h-3.5 ${isStreaming ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
          <span className="text-slate-700 dark:text-slate-300 hidden md:inline font-medium">
            {isStreaming ? 'SignalR: Дані наживо' : 'SignalR: Немає зв’язку'}
          </span>
        </div>

        {/* Обмежувач ширини для випадаючого списку теплиць */}
        <div className="min-w-0 max-w-[220px] sm:max-w-[300px] md:max-w-md">
          <GreenhouseSelector />
        </div>
      </div>

      {/* Права частина: Дзвіночок глобальних тривог + Тема + Користувач + Вихід */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 relative" ref={dropdownRef}>
        
        {/* Глобальний індикатор тривог (Дзвіночок) */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            title="Глобальні активні сповіщення по всіх теплицях"
            className={`p-2 rounded-xl transition-colors cursor-pointer relative ${
              globalAlerts.length > 0
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            {globalAlerts.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4 px-1 bg-rose-500 text-white !text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-xs">
                {globalAlerts.length}
              </span>
            )}
          </button>

          {/* Випадаючий список глобальних тривог */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Тривоги по комплексах
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full">
                  Всього: {globalAlerts.length}
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {globalAlerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Усі теплиці працюють у штатному режимі. Аномалій немає.
                  </div>
                ) : (
                  globalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        if (onSelectAlert) {
                          onSelectAlert(alert.greenhouseId);
                        }
                      }}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {alert.greenhouseName && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-200 dark:border-emerald-500/20">
                              {alert.greenhouseName}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {alert.message}
                        </p>
                      </div>

                      <div className="self-center text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Перемикач теми */}
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

        {/* Блок користувача */}
        <div className="hidden lg:flex flex-col text-right pl-3 border-l border-slate-200 dark:border-slate-800 max-w-[140px]">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={user?.username || user?.email}>
            {user?.username || user?.email}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {roleLabel}
          </span>
        </div>

        {/* Кнопка виходу */}
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