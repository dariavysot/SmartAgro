import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { GreenhouseThresholds } from '../types/threshold';
import {
  Sliders,
  Thermometer,
  Droplets,
  Cloud,
  Layers,
  Save,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'smartagro_greenhouse_thresholds';

const defaultThresholds: GreenhouseThresholds = {
  minTemperature: 18.0,
  maxTemperature: 28.0,
  minHumidity: 50.0,
  maxHumidity: 80.0,
  maxCo2Level: 1000.0,
  minSoilMoisture: 45.0,
  maxSoilMoisture: 75.0,
};

export const Thresholds: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [thresholds, setThresholds] = useState<GreenhouseThresholds>(defaultThresholds);
  const [isSaving, setIsSaving] = useState(false);

  const loadThresholds = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setThresholds(JSON.parse(saved));
      } else {
        setThresholds(defaultThresholds);
      }
    } catch {
      setThresholds(defaultThresholds);
    }
  };

  useEffect(() => {
    loadThresholds();
  }, []);

  const handleChange = (field: keyof GreenhouseThresholds, value: string) => {
    const num = parseFloat(value);
    setThresholds((prev) => ({
      ...prev,
      [field]: isNaN(num) ? 0 : num,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Лише користувачі з роллю Admin можуть змінювати параметри!');
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
      toast.success('Порогові ліміти успішно збережено!');
    } catch {
      toast.error('Не вдалося зберегти налаштування.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!isAdmin) return;
    setThresholds(defaultThresholds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultThresholds));
    toast.success('Скинуто до заводських налаштувань');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Конфігурація меж теплиці</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Критичні діапазони для спрацьовування тривог і автоматики мікроклімату
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>За замовчуванням</span>
            </button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
          <span>
            Ви увійшли як <strong>Оператор</strong>. Форма відкрита в режимі перегляду. Для зміни меж увійдіть під обліковим записом адміністратора.
          </span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Температура */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Thermometer className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Температурний режим (°C)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Мінімум (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.minTemperature}
                  onChange={(e) => handleChange('minTemperature', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Максимум (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.maxTemperature}
                  onChange={(e) => handleChange('maxTemperature', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Вологість повітря */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Droplets className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Вологість повітря (%)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Мінімум (%)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.minHumidity}
                  onChange={(e) => handleChange('minHumidity', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Максимум (%)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.maxHumidity}
                  onChange={(e) => handleChange('maxHumidity', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Концентрація CO2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Концентрація CO₂ (ppm)</h3>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Граничний максимум (ppm)</label>
              <input
                type="number"
                step="10"
                disabled={!isAdmin || isSaving}
                value={thresholds.maxCo2Level}
                onChange={(e) => handleChange('maxCo2Level', e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Вологість ґрунту */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Вологість ґрунту (%)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Мінімум (%)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.minSoilMoisture}
                  onChange={(e) => handleChange('minSoilMoisture', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Максимум (%)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.maxSoilMoisture}
                  onChange={(e) => handleChange('maxSoilMoisture', e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Збереження...' : 'Зберегти конфігурацію'}</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end items-center gap-2 text-slate-500 text-xs">
            <Lock className="w-4 h-4" />
            <span>Збереження заблоковано для ролі Operator</span>
          </div>
        )}
      </form>
    </div>
  );
};