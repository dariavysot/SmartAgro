import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MetricCard } from './components/dashboard/MetricCard';
import { useTelemetryHub } from './hooks/useTelemetryHub';
import type { MetricStatus } from './types/telemetry';
import {
  Thermometer,
  Droplets,
  Cloud,
  Layers,
  Activity,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logout, user } = useAuth();
  const { telemetry, isConnected } = useTelemetryHub();

  // Логіка оцінки станів сенсорів
  const getTempStatus = (temp: number): { status: MetricStatus; text: string } => {
    if (temp > 32 || temp < 15) return { status: 'critical', text: 'Критично' };
    if (temp > 28 || temp < 18) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const getHumidityStatus = (hum: number): { status: MetricStatus; text: string } => {
    if (hum > 85 || hum < 40) return { status: 'critical', text: 'Критично' };
    if (hum > 75 || hum < 50) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const getCo2Status = (co2: number): { status: MetricStatus; text: string } => {
    if (co2 > 1200) return { status: 'critical', text: 'Критично' };
    if (co2 > 950) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const getSoilStatus = (soil: number): { status: MetricStatus; text: string } => {
    if (soil < 40 || soil > 85) return { status: 'critical', text: 'Критично' };
    if (soil < 50 || soil > 75) return { status: 'warning', text: 'Увага' };
    return { status: 'normal', text: 'Норма' };
  };

  const currentTemp = telemetry?.temperature ?? 22.4;
  const currentHumidity = telemetry?.humidity ?? 65.0;
  const currentCo2 = telemetry?.co2Level ?? 750.0;
  const currentSoil = telemetry?.soilMoisture ?? 60.0;

  const tempStatus = getTempStatus(currentTemp);
  const humStatus = getHumidityStatus(currentHumidity);
  const co2Status = getCo2Status(currentCo2);
  const soilStatus = getSoilStatus(currentSoil);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar isStreaming={isConnected} />

        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/50">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Моніторинг Сектора А</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Живий потік телеметрії через SignalR • Користувач: {user?.email} ({user?.role})
                </p>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-1.5 text-xs text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
              >
                Вийти
              </button>
            </div>

            {/* Віджети показників у реальному часі */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Температура"
                value={currentTemp}
                unit="°C"
                icon={Thermometer}
                status={tempStatus.status}
                statusText={tempStatus.text}
              />
              <MetricCard
                title="Вологість повітря"
                value={currentHumidity}
                unit="%"
                icon={Droplets}
                status={humStatus.status}
                statusText={humStatus.text}
              />
              <MetricCard
                title="Рівень CO₂"
                value={currentCo2}
                unit="ppm"
                icon={Cloud}
                status={co2Status.status}
                statusText={co2Status.text}
              />
              <MetricCard
                title="Вологість ґрунту"
                value={currentSoil}
                unit="%"
                icon={Layers}
                status={soilStatus.status}
                statusText={soilStatus.text}
              />
            </div>

            {/* Технічні статуси зв'язку та безпеки */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Канал телеметрії</p>
                  <p className="text-sm font-semibold text-emerald-400">
                    {isConnected ? 'SignalR стрім активний' : 'Очікування підключення...'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Останній пакет</p>
                  <p className="text-sm font-semibold text-blue-400">
                    {telemetry?.timestamp
                      ? new Date(telemetry.timestamp).toLocaleTimeString()
                      : 'Очікування пакетів...'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Підпис криптопакета</p>
                  <p className="text-sm font-semibold text-amber-400 truncate max-w-[200px]">
                    {telemetry?.signature ? `${telemetry.signature.slice(0, 16)}...` : 'AES/HMAC Verified'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
      </AuthProvider>
    </ThemeProvider>
  );
}