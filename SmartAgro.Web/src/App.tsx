import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logout } = useAuth();

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar isStreaming={true} />

        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/50">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Моніторинг Сектора А</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Телеметрія мікроклімату, ризики ML та статус криптографічного шлюзу.
                </p>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                Вийти
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Статус системи</p>
                  <p className="text-sm font-semibold text-emerald-400">Симулятор активний (4с)</p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">ML Модель</p>
                  <p className="text-sm font-semibold text-blue-400">ONNX Inference Ready</p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <ShieldAlert className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Безпека пакетів</p>
                  <p className="text-sm font-semibold text-amber-400">HMAC-SHA256 Verified</p>
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

            {/* Захищений розділ додатку */}
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