import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGreenhouse } from '../context/GreenhouseContext';
import { apiClient } from '../api/client';
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
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { selectedGreenhouse } = useGreenhouse();
  const isAdmin = user?.role === 'Admin';

  const [thresholds, setThresholds] = useState<GreenhouseThresholds>(defaultThresholds);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Завантаження актуальних меж із сервера для обраної теплиці
  useEffect(() => {
    if (!selectedGreenhouse?.id) return;

    let isMounted = true;
    setIsLoading(true);

    apiClient
      .get(`/Thresholds/${selectedGreenhouse.id}`)
      .then((response) => {
        if (!isMounted) return;
        if (response.data) {
          setThresholds({
            minTemperature: response.data.minTemperature ?? defaultThresholds.minTemperature,
            maxTemperature: response.data.maxTemperature ?? defaultThresholds.maxTemperature,
            minHumidity: response.data.minHumidity ?? defaultThresholds.minHumidity,
            maxHumidity: response.data.maxHumidity ?? defaultThresholds.maxHumidity,
            maxCo2Level: response.data.maxCo2Level ?? defaultThresholds.maxCo2Level,
            minSoilMoisture: response.data.minSoilMoisture ?? defaultThresholds.minSoilMoisture,
            maxSoilMoisture: response.data.maxSoilMoisture ?? defaultThresholds.maxSoilMoisture,
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        // Якщо 404 (налаштування ще не створені), ставимо дефолтні значення
        if (err.response?.status === 404) {
          setThresholds(defaultThresholds);
        } else {
          console.error('[Thresholds Load Error]:', err);
          toast.error('Не вдалося завантажити межі з сервера.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGreenhouse?.id]);

  const handleChange = (field: keyof GreenhouseThresholds, value: string) => {
    const num = parseFloat(value);
    const nonNegativeValue = isNaN(num) ? 0 : Math.max(0, num);

    setThresholds((prev) => ({
      ...prev,
      [field]: nonNegativeValue,
    }));
  };

  // 2. Збереження меж напряму в базу даних через POST /api/Thresholds/{greenhouseId}
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('Лише користувачі з роллю Admin можуть змінювати параметри!');
      return;
    }

    if (!selectedGreenhouse?.id) {
      toast.error('Спочатку оберіть теплицю у шапці!');
      return;
    }

    // Клієнтська валідація, що дублює бізнес-правила бекенду
    if (thresholds.minTemperature >= thresholds.maxTemperature) {
      toast.error('Мінімальна температура повинна бути меншою за максимальну!');
      return;
    }
    if (thresholds.minHumidity >= thresholds.maxHumidity) {
      toast.error('Мінімальна вологість повітря повинна бути меншою за максимальну!');
      return;
    }
    if (thresholds.minSoilMoisture >= thresholds.maxSoilMoisture) {
      toast.error('Мінімальна вологість ґрунту повинна бути меншою за максимальну!');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        minTemperature: thresholds.minTemperature,
        maxTemperature: thresholds.maxTemperature,
        minHumidity: thresholds.minHumidity,
        maxHumidity: thresholds.maxHumidity,
        maxCo2Level: thresholds.maxCo2Level,
      };

      await apiClient.post(`/Thresholds/${selectedGreenhouse.id}`, payload);
      toast.success(`Порогові межі для «${selectedGreenhouse.name}» успішно оновлено!`);
    } catch (err: any) {
      console.error('[Thresholds Save Error]:', err);
      const msg = err.response?.data?.message || 'Не вдалося зберегти налаштування.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!isAdmin) return;
    setThresholds(defaultThresholds);
    toast.success('Параметри на формі скинуто до базових. Натисніть «Зберегти», щоб застосувати їх.');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Шапка сторінки */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Конфігурація меж теплиці</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Критичні діапазони для {selectedGreenhouse ? `«${selectedGreenhouse.name}»` : 'обраної теплиці'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading || isSaving}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>За замовчуванням</span>
            </button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 dark:text-amber-400" />
          <span>
            Ви увійшли як <strong>Користувач</strong>. Форма відкрита в режимі перегляду. Для зміни меж увійдіть під обліковим записом адміністратора.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="ml-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Отримання конфігурації з сервера...
          </span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Температура */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <Thermometer className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Температурний режим (°C)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Мінімум (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!isAdmin || isSaving}
                    value={thresholds.minTemperature}
                    onChange={(e) => handleChange('minTemperature', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Максимум (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!isAdmin || isSaving}
                    value={thresholds.maxTemperature}
                    onChange={(e) => handleChange('maxTemperature', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Вологість повітря */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg border border-cyan-100 dark:border-cyan-500/20">
                  <Droplets className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Вологість повітря (%)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Мінімум (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={!isAdmin || isSaving}
                    value={thresholds.minHumidity}
                    onChange={(e) => handleChange('minHumidity', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Максимум (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={!isAdmin || isSaving}
                    value={thresholds.maxHumidity}
                    onChange={(e) => handleChange('maxHumidity', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Концентрація CO2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-100 dark:border-purple-500/20">
                  <Cloud className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Концентрація CO₂ (ppm)</h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Граничний максимум (ppm)</label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  disabled={!isAdmin || isSaving}
                  value={thresholds.maxCo2Level}
                  onChange={(e) => handleChange('maxCo2Level', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Вологість ґрунту */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-500/20">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Вологість ґрунту (%)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Мінімум (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={!isAdmin || isSaving}
                    value={thresholds.minSoilMoisture}
                    onChange={(e) => handleChange('minSoilMoisture', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Максимум (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    disabled={!isAdmin || isSaving}
                    value={thresholds.maxSoilMoisture}
                    onChange={(e) => handleChange('maxSoilMoisture', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 disabled:opacity-60 rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Кнопка збереження */}
          {isAdmin ? (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 active:bg-emerald-700 disabled:opacity-50 text-white dark:text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Збереження...' : 'Зберегти конфігурацію'}</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-end items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
              <Lock className="w-4 h-4" />
              <span>Збереження заблоковано для ролі Користувач</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
};