import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GreenhouseProvider, useGreenhouse } from './context/GreenhouseContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Thresholds } from './pages/Thresholds';
import { Greenhouses } from './pages/Greenhouses';
import { Alerts } from './pages/Alerts';
import { UsersManagement } from './pages/UsersManagement';
import { MetricCard } from './components/dashboard/MetricCard';
import { TelemetryChart, type ChartPoint } from './components/dashboard/TelemetryChart';
import { DiseaseRiskWidget } from './components/dashboard/DiseaseRiskWidget';
import { AlertsPanel, type AlertItem } from './components/dashboard/AlertsPanel';
import { useTelemetryHub } from './hooks/useTelemetryHub';
import { apiClient } from './api/client';
import type { MetricStatus, RiskBreakdown } from './types/telemetry';
import type { GreenhouseThresholds } from './types/threshold';
import {
  Thermometer,
  Droplets,
  Cloud,
  Layers,
  Clock,
  Warehouse,
  Plus,
  Menu,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface TelemetryRecord {
  id: string;
  greenhouseId: string;
  temperature: number;
  humidity: number;
  co2Level: number;
  diseaseRiskScore: number;
  soilMoisture?: number;
  signature?: string;
  timestamp: string;
  riskBreakdown?: RiskBreakdown;
}

interface BackendAlert {
  id: number;
  greenhouseId: string;
  greenhouseName: string;
  message: string;
  severity: string;
  isResolved: boolean;
  createdAt: string;
}

const defaultThresholds: GreenhouseThresholds = {
  minTemperature: 18.0,
  maxTemperature: 28.0,
  minHumidity: 50.0,
  maxHumidity: 80.0,
  maxCo2Level: 1000.0,
  minSoilMoisture: 45.0,
  maxSoilMoisture: 75.0,
};

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const { greenhouses, selectedGreenhouse, isLoading } = useGreenhouse();
  const { telemetry: liveTelemetry, isConnected } = useTelemetryHub();

  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<TelemetryRecord | null>(null);
  const [thresholds, setThresholds] = useState<GreenhouseThresholds>(defaultThresholds);

  // 1. Завантаження виключно активних сповіщень із бекенду
  const fetchActiveAlerts = useCallback(async () => {
    try {
      const res = await apiClient.get<BackendAlert[]>('/Alerts/active');
      const filtered = res.data
        .filter((a) => !selectedGreenhouse?.id || a.greenhouseId === selectedGreenhouse.id)
        .map((a) => ({
          id: a.id,
          message: a.message,
          type: a.severity,
          timestamp: a.createdAt,
          greenhouseName: a.greenhouseName,
        }));
      setAlerts(filtered);
    } catch (err) {
      console.error('Помилка завантаження активних тривог:', err);
    }
  }, [selectedGreenhouse?.id]);

  // 2. Початкове завантаження телеметрії, порогів та активних тривог
  useEffect(() => {
    fetchActiveAlerts();

    if (!selectedGreenhouse?.id) {
      setHistory([]);
      setCurrentSnapshot(null);
      setThresholds(defaultThresholds);
      return;
    }

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [latestRes, historyRes, thresholdsRes] = await Promise.allSettled([
          apiClient.get<TelemetryRecord>(`/Telemetry/latest/${selectedGreenhouse.id}`),
          apiClient.get<TelemetryRecord[]>(`/Telemetry/history/${selectedGreenhouse.id}?limit=20`),
          apiClient.get<GreenhouseThresholds>(`/Thresholds/${selectedGreenhouse.id}`),
        ]);

        if (!isMounted) return;

        if (latestRes.status === 'fulfilled' && latestRes.value.data) {
          setCurrentSnapshot(latestRes.value.data);
        } else {
          setCurrentSnapshot(null);
        }

        if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value.data)) {
          const points: ChartPoint[] = [...historyRes.value.data].reverse().map((item) => ({
            time: new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            temperature: item.temperature,
            humidity: item.humidity,
            co2: item.co2Level,
          }));
          setHistory(points);
        } else {
          setHistory([]);
        }

        if (thresholdsRes.status === 'fulfilled' && thresholdsRes.value.data) {
          const t = thresholdsRes.value.data;
          setThresholds({
            minTemperature: t.minTemperature ?? defaultThresholds.minTemperature,
            maxTemperature: t.maxTemperature ?? defaultThresholds.maxTemperature,
            minHumidity: t.minHumidity ?? defaultThresholds.minHumidity,
            maxHumidity: t.maxHumidity ?? defaultThresholds.maxHumidity,
            maxCo2Level: t.maxCo2Level ?? defaultThresholds.maxCo2Level,
            minSoilMoisture: t.minSoilMoisture ?? defaultThresholds.minSoilMoisture,
            maxSoilMoisture: t.maxSoilMoisture ?? defaultThresholds.maxSoilMoisture,
          });
        } else {
          setThresholds(defaultThresholds);
        }
      } catch (err) {
        console.error('Не вдалося завантажити початкову телеметрію:', err);
      }
    };

    loadInitialData();

    // Періодичне оновлення активних тривог кожні 15 секунд
    const interval = setInterval(fetchActiveAlerts, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedGreenhouse?.id, fetchActiveAlerts, activeTab]);

  // 3. Обробка живого потоку SignalR
  useEffect(() => {
    if (!liveTelemetry) return;

    if (selectedGreenhouse && liveTelemetry.greenhouseId && liveTelemetry.greenhouseId !== selectedGreenhouse.id) {
      return;
    }

    setCurrentSnapshot({
      id: liveTelemetry.id || '',
      greenhouseId: liveTelemetry.greenhouseId,
      temperature: liveTelemetry.temperature,
      humidity: liveTelemetry.humidity,
      co2Level: liveTelemetry.co2Level,
      diseaseRiskScore: liveTelemetry.diseaseRiskScore,
      soilMoisture: liveTelemetry.soilMoisture ?? 60.0,
      signature: liveTelemetry.signature,
      timestamp: liveTelemetry.timestamp || new Date().toISOString(),
      riskBreakdown: liveTelemetry.riskBreakdown,
    });

    const timeLabel = new Date(liveTelemetry.timestamp || Date.now()).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setHistory((prev) => {
      const updated = [
        ...prev,
        {
          time: timeLabel,
          temperature: liveTelemetry.temperature,
          humidity: liveTelemetry.humidity,
          co2: liveTelemetry.co2Level,
        },
      ];
      return updated.slice(-20);
    });

    // Якщо показник вийшов за налаштовані межі — оновлюємо список тривог із сервера
    if (
      liveTelemetry.temperature > thresholds.maxTemperature ||
      liveTelemetry.temperature < thresholds.minTemperature ||
      liveTelemetry.humidity > thresholds.maxHumidity ||
      liveTelemetry.humidity < thresholds.minHumidity ||
      liveTelemetry.co2Level > thresholds.maxCo2Level
    ) {
      fetchActiveAlerts();
    }
  }, [liveTelemetry, selectedGreenhouse, thresholds, fetchActiveAlerts]);

  // 4. Позначення тривоги як вирішеної через API
  const handleDismissAlert = async (id: number) => {
    try {
      await apiClient.post(`/Alerts/${id}/resolve`);
      toast.success(`Тривогу #${id} вирішено`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Не вдалося оновити статус тривоги на сервері');
    }
  };

  // 5. Масове вирішення всіх активних тривог обраної теплиці
  const handleDismissAllAlerts = async () => {
    if (alerts.length === 0) return;

    const results = await Promise.allSettled(
      alerts.map((alert) => apiClient.post(`/Alerts/${alert.id}/resolve`))
    );

    const resolvedIds = alerts
      .filter((_, idx) => results[idx].status === 'fulfilled')
      .map((a) => a.id);

    if (resolvedIds.length > 0) {
      setAlerts((prev) => prev.filter((a) => !resolvedIds.includes(a.id)));
      toast.success(`Вирішено сповіщень: ${resolvedIds.length}`);
    }

    if (resolvedIds.length < alerts.length) {
      toast.error('Частину сповіщень не вдалося оновити на сервері');
    }
  };

  // Динамічна оцінка статусу відносно налаштованих меж теплиці
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

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden ml-4 p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="Відкрити меню"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <Navbar isStreaming={isConnected} />
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
          {activeTab === 'thresholds' ? (
            <Thresholds />
          ) : activeTab === 'greenhouses' ? (
            <Greenhouses />
          ) : activeTab === 'alerts' ? (
            <Alerts />
          ) : activeTab === 'users' && user?.role === 'Admin' ? (
            <UsersManagement />
          ) : !isLoading && greenhouses.length === 0 ? (
            <div className="max-w-2xl mx-auto mt-16 p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm dark:shadow-none">
              <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                <Warehouse className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">У вас ще немає підключених теплиць</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {user?.role === 'Admin'
                  ? 'Щоб розпочати IoT-моніторинг мікроклімату, змонтуйте перший тепличний сектор у панелі керування.'
                  : 'Адміністратор господарства ще не закріпив за вашим обліковим записом жодного тепличного сектора.'}
              </p>
              {user?.role === 'Admin' && (
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
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Заголовок теплиці та  плашка  */}
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
                      Актуально на
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
                  <TelemetryChart data={history} />
                </div>
                <div className="h-full">
                  <DiseaseRiskWidget
                    riskScore={currentRisk ?? 0}
                    breakdown={currentSnapshot?.riskBreakdown}
                  />
                </div>
              </div>

              {/* Сповіщення на всю ширину */}
              <div>
                <AlertsPanel
                  alerts={alerts}
                  onDismiss={handleDismissAlert}
                  onDismissAll={handleDismissAllAlerts}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GreenhouseProvider>
          <Toaster position="top-right" />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardLayout />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </GreenhouseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}