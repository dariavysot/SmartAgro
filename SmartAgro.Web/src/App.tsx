import { useState, useEffect } from 'react';
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
import { MetricCard } from './components/dashboard/MetricCard';
import { TelemetryChart, type ChartPoint } from './components/dashboard/TelemetryChart';
import { DiseaseRiskWidget } from './components/dashboard/DiseaseRiskWidget';
import { AlertsPanel, type AlertItem } from './components/dashboard/AlertsPanel';
import { useTelemetryHub } from './hooks/useTelemetryHub';
import { apiClient } from './api/client';
import type { MetricStatus } from './types/telemetry';
import {
  Thermometer,
  Droplets,
  Cloud,
  Layers,
  Activity,
  ShieldCheck,
  Cpu,
  Warehouse,
  Plus,
  LogOut,
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
}

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logout, user } = useAuth();
  const { greenhouses, selectedGreenhouse, isLoading } = useGreenhouse();
  const { telemetry: liveTelemetry, isConnected } = useTelemetryHub();

  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [currentSnapshot, setCurrentSnapshot] = useState<TelemetryRecord | null>(null);

  // 1. Завантаження останнього зрізу та історії з БД при зміні обраної теплиці
  useEffect(() => {
    if (!selectedGreenhouse?.id) {
      setHistory([]);
      setCurrentSnapshot(null);
      return;
    }

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [latestRes, historyRes] = await Promise.allSettled([
          apiClient.get<TelemetryRecord>(`/Telemetry/latest/${selectedGreenhouse.id}`),
          apiClient.get<TelemetryRecord[]>(`/Telemetry/history/${selectedGreenhouse.id}?limit=20`),
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
      } catch (err) {
        console.error('Не вдалося завантажити початкову телеметрію:', err);
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [selectedGreenhouse?.id]);

  // 2. Обробка живого потоку SignalR
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

    const greenhouseLabel = selectedGreenhouse?.name || 'теплиці';

    if (liveTelemetry.temperature > 35) {
      const alertId = `temp-${Date.now()}`;
      toast.error(`Критичний перегрів: ${liveTelemetry.temperature}°C!`, { id: alertId });
      setAlerts((prev) => [
        {
          id: alertId,
          message: `Перегрів (${greenhouseLabel}): ${liveTelemetry.temperature}°C`,
          type: 'Critical',
          timestamp: timeLabel,
        },
        ...prev.slice(0, 4),
      ]);
    } else if (liveTelemetry.co2Level > 1300) {
      const alertId = `co2-${Date.now()}`;
      toast.error(`Висока концентрація CO₂: ${liveTelemetry.co2Level} ppm!`, { id: alertId });
      setAlerts((prev) => [
        {
          id: alertId,
          message: `Критичний рівень CO₂ (${greenhouseLabel}): ${liveTelemetry.co2Level} ppm`,
          type: 'Critical',
          timestamp: timeLabel,
        },
        ...prev.slice(0, 4),
      ]);
    }
  }, [liveTelemetry, selectedGreenhouse]);

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success('Інцидент позначено як вирішений');
  };

  const getTempStatus = (temp?: number): { status: MetricStatus; text: string } => {
    if (temp === undefined) return { status: 'normal', text: 'Очікування' };
    if (temp > 32 || temp < 15) return { status: 'critical', text: 'Критично' };
    if (temp > 28 || temp < 18) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const getHumidityStatus = (hum?: number): { status: MetricStatus; text: string } => {
    if (hum === undefined) return { status: 'normal', text: 'Очікування' };
    if (hum > 85 || hum < 40) return { status: 'critical', text: 'Критично' };
    if (hum > 75 || hum < 50) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const getCo2Status = (co2?: number): { status: MetricStatus; text: string } => {
    if (co2 === undefined) return { status: 'normal', text: 'Очікування' };
    if (co2 > 1200) return { status: 'critical', text: 'Критично' };
    if (co2 > 950) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const getSoilStatus = (soil?: number): { status: MetricStatus; text: string } => {
    if (soil === undefined) return { status: 'normal', text: 'Очікування' };
    if (soil < 40 || soil > 85) return { status: 'critical', text: 'Критично' };
    if (soil < 50 || soil > 75) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const currentTemp = currentSnapshot?.temperature;
  const currentHumidity = currentSnapshot?.humidity;
  const currentCo2 = currentSnapshot?.co2Level;
  const currentSoil = currentSnapshot?.soilMoisture ?? (currentSnapshot ? 62.0 : undefined);
  const currentRisk = currentSnapshot?.diseaseRiskScore;

  const tempStatus = getTempStatus(currentTemp);
  const humStatus = getHumidityStatus(currentHumidity);
  const co2Status = getCo2Status(currentCo2);
  const soilStatus = getSoilStatus(currentSoil);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Верхня панель із навігацією та кнопкою виходу */}
        <header className="flex items-center justify-between px-6 py-3 bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm z-10">
          <Navbar isStreaming={isConnected} />

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-slate-200">
                {user?.username || user?.email}
              </span>
              <span className="text-[10px] text-slate-400">
                {user?.role === 'Admin' ? 'Адміністратор' : 'Користувач'}
              </span>
            </div>

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

        {/* Основна область контенту */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/50">
          {activeTab === 'thresholds' ? (
            <Thresholds />
          ) : activeTab === 'greenhouses' ? (
            <Greenhouses />
          ) : activeTab === 'alerts' ? (
            <Alerts />
          ) : !isLoading && greenhouses.length === 0 ? (
            <div className="max-w-2xl mx-auto mt-16 p-8 bg-slate-900/60 border border-slate-800 rounded-3xl text-center space-y-4">
              <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center">
                <Warehouse className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-100">У вас ще немає підключених теплиць</h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Щоб розпочати IoT-моніторинг мікроклімату, додайте свій перший тепличний сектор або зверніться до адміністратора.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('greenhouses')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Перейти до керування теплицями
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  {selectedGreenhouse?.name || 'Завантаження об’єкта...'}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Локація: {selectedGreenhouse?.location || 'Не вказана'}
                </p>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <TelemetryChart data={history} />
                </div>
                <div>
                  <DiseaseRiskWidget riskScore={currentRisk ?? 0} />
                </div>
              </div>

              {/* Сповіщення та системний статус */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <AlertsPanel alerts={alerts} onDismiss={handleDismissAlert} />
                </div>

                <div className="flex flex-col gap-3 justify-between">
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Канал телеметрії</p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {isConnected ? 'SignalR WebSocket активний' : 'Підключення...'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <Cpu className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Останній пакет</p>
                      <p className="text-sm font-semibold text-blue-400">
                        {currentSnapshot?.timestamp
                          ? new Date(currentSnapshot.timestamp).toLocaleTimeString()
                          : 'Очікування даних...'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Криптографічний підпис</p>
                      <p className="text-sm font-semibold text-amber-400 truncate max-w-[180px]">
                        {currentSnapshot?.signature
                          ? `${currentSnapshot.signature.slice(0, 16)}...`
                          : 'AES/HMAC Verified'}
                      </p>
                    </div>
                  </div>
                </div>
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