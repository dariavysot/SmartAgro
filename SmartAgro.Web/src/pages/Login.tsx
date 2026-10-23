import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sprout, Lock, Mail, AlertCircle, Sun, Moon } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post('/Auth/login', {
        email,
        username: email,
        password,
      });

      console.log('[Login API Response]:', response.data);

      login(response.data);
      navigate('/');
    } catch (err: any) {
      console.error('[Login API Error]:', err);
      const msg =
        err.response?.data?.message ||
        (err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(', ')
          : 'Невірний логін або пароль');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-colors">
      {/* Кнопка перемикача теми на сторінці авторизації */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-sm transition-colors cursor-pointer"
        title={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5 text-slate-700" />
        )}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm dark:shadow-2xl transition-colors">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 mb-3">
            <Sprout className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">SmartAgro</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Авторизація користувача системи</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@smartagro.ua"
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Пароль</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 active:bg-emerald-700 disabled:opacity-50 text-white dark:text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {isLoading ? 'Перевірка...' : 'Увійти в панель'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-6">
          Внутрішня система SmartAgro. Для отримання або відновлення доступу зверніться до системного адміністратора господарства.
        </p>
      </div>
    </div>
  );
};