import React from 'react';
import { Thermometer, Droplets, Cloud, Layers, Clock, Warehouse, Plus } from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { TelemetryChart } from '../components/dashboard/TelemetryChart';
import { DiseaseRiskWidget } from '../components/dashboard/DiseaseRiskWidget';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import type { MetricStatus } from '../types/telemetry';
import type { GreenhouseThresholds } from '../types/threshold';
import type { TelemetryRecord } from '../hooks/useDashboardTelemetry';
import type { AlertItem } from '../components/dashboard/AlertsPanel';

interface DashboardProps {
  selectedGreenhouse: any;
  greenhousesCount: number;
  isLoadingGreenhouses: boolean;
  userRole?: string;
  chartRange: '20' | '1h' | '24h';
  setChartRange: (range: '20' | '1h' | '24h') => void;
  history: any[];
  currentSnapshot: TelemetryRecord | null;
  thresholds: GreenhouseThresholds;
  greenhouseAlerts: AlertItem[];
  onDismissAlert: (id: number) => Promise<void> | void;
  onDismissAllAlerts: () => Promise<void> | void;
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  selectedGreenhouse,
  greenhousesCount,
  isLoadingGreenhouses,
  userRole,
  chartRange,
  setChartRange,
  history,
  currentSnapshot,
  thresholds,
  greenhouseAlerts,
  onDismissAlert,
  onDismissAllAlerts,
  setActiveTab,
}) => {
  const evaluateRangeStatus = (
    val: number | undefined,
    min: number,
    max: number
  ): { status: MetricStatus; text: string } => {
    if (val === undefined) return { status: 'normal', text: 'Очікування' };
    if (val > max || val < min) return { status: 'critical', text: 'Критично' };

    const warningBuffer = Math.max((max - min) * 0.15, 0);
    if (val >= max - warningBuffer || val <= min + warningBuffer) {
      return { status: 'warning', text: 'Увага' };
    }
    return { status: 'normal', text: 'Норма' };
  };

  const getCo2Status = (co2?: number): { status: MetricStatus; text: string } => {
    if (co2 === undefined) return { status: 'normal', text: 'Очікування' };
    if (co2 > thresholds.maxCo2Level) return { status: 'critical', text: 'Критично' };
    if (co2 >= thresholds.maxCo2Level * 0.85) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const currentTemp = currentSnapshot?.temperature;
  const currentHumidity = currentSnapshot?.humidity;
  const currentCo2 = currentSnapshot?.co2Level;
  const currentSoil = currentSnapshot?.soilMoisture ?? (currentSnapshot ? 62.0 : undefined);
  const currentRisk = currentSnapshot?.diseaseRiskScore;

  const tempStatus = evaluateRangeStatus(currentTemp, thresholds.minTemperature, thresholds.maxTemperature);
  const humStatus = evaluateRangeStatus(currentHumidity, thresholds.minHumidity, thresholds.maxHumidity);
  const co2Status = getCo2Status(currentCo2);
  const soilStatus = evaluateRangeStatus(currentSoil, thresholds.minSoilMoisture, thresholds.maxSoilMoisture);

  if (!isLoadingGreenhouses && greenhousesCount === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
          <Warehouse className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">У вас ще немає підключених теплиць</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {userRole === 'Admin'
            ? 'Щоб розпочати IoT-моніторинг мікроклімату, змонтуйте перший тепличний сектор у панелі керування.'
            : 'Адміністратор господарства ще не закріпив за вашим обліковим записом жодного тепличного сектора.'}
        </p>
        {userRole === 'Admin' && (
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('greenhouses')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Перейти до керування теплицями
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Заголовок теплиці та плашка останнього виміру */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {selectedGreenhouse?.name || 'Завантаження об’єкта...'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Локація: {selectedGreenhouse?.location || 'Не вказана'}
          </p>
        </div>

        <div className="inline-flex items-center gap-3.5 px-5 py-2.5 sm:min-w-[190px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs self-start sm:self-auto">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Актуально станом на
            </p>
            <p className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
              {currentSnapshot?.timestamp
                ? new Date(currentSnapshot.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Очікування даних...'}
            </p>
          </div>
        </div>
      </div>

      {/* Метричні картки */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Температура"
          value={currentTemp !== undefined ? currentTemp : '—'}
          unit="°C"
          icon={Thermometer}
          status={tempStatus.status}
          statusText={tempStatus.text}
        />
        <MetricCard
          title="Вологість повітря"
          value={currentHumidity !== undefined ? currentHumidity : '—'}
          unit="%"
          icon={Droplets}
          status={humStatus.status}
          statusText={humStatus.text}
        />
        <MetricCard
          title="Рівень CO₂"
          value={currentCo2 !== undefined ? currentCo2 : '—'}
          unit="ppm"
          icon={Cloud}
          status={co2Status.status}
          statusText={co2Status.text}
        />
        <MetricCard
          title="Вологість ґрунту"
          value={currentSoil !== undefined ? currentSoil : '—'}
          unit="%"
          icon={Layers}
          status={soilStatus.status}
          statusText={soilStatus.text}
        />
      </div>

      {/* Графіки та ML */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 h-full">
          <TelemetryChart
            data={history}
            selectedRange={chartRange}
            onRangeChange={setChartRange}
          />
        </div>
        <div className="h-full">
          <DiseaseRiskWidget
            riskScore={currentRisk ?? 0}
            breakdown={currentSnapshot?.riskBreakdown}
          />
        </div>
      </div>

      {/* Оперативні сповіщення */}
      <div>
        <AlertsPanel
          alerts={greenhouseAlerts}
          onDismiss={onDismissAlert}
          onDismissAll={onDismissAllAlerts}
          onViewAll={() => setActiveTab('alerts')}
        />
      </div>
    </div>
  );
};