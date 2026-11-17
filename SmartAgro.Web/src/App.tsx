import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GreenhouseProvider, useGreenhouse } from './context/GreenhouseContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/routes/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Thresholds } from './pages/Thresholds';
import { Greenhouses } from './pages/Greenhouses';
import { Alerts } from './pages/Alerts';
import { UsersManagement } from './pages/UsersManagement';
import { Dashboard } from './pages/Dashboard';
import { useDashboardTelemetry } from './hooks/useDashboardTelemetry';
import { apiClient } from './api/client';
import { Menu } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function DashboardLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chartRange, setChartRange] = useState<'20' | '1h' | '24h'>('20');
  
  const { user } = useAuth();
  const { greenhouses, selectedGreenhouse, setSelectedGreenhouseId, isLoading } = useGreenhouse();

  const {
    history,
    allGlobalAlerts,
    setAllGlobalAlerts,
    greenhouseAlerts,
    setGreenhouseAlerts,
    currentSnapshot,
    thresholds,
    isConnected,
  } = useDashboardTelemetry(chartRange, activeTab);

  const handleSelectAlertFromNavbar = (targetGreenhouseId: string) => {
    setSelectedGreenhouseId(targetGreenhouseId);
    setActiveTab('dashboard');
  };

  const handleDismissAlert = async (id: number) => {
    try {
      await apiClient.post(`/Alerts/${id}/resolve`);
      toast.success(`Тривогу #${id} вирішено`);
      setGreenhouseAlerts((prev) => prev.filter((a) => a.id !== id));
      setAllGlobalAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Не вдалося оновити статус тривоги на сервері');
    }
  };

  const handleDismissAllAlerts = async () => {
    if (greenhouseAlerts.length === 0) return;

    const results = await Promise.allSettled(
      greenhouseAlerts.map((alert) => apiClient.post(`/Alerts/${alert.id}/resolve`))
    );

    const resolvedIds = greenhouseAlerts
      .filter((_, idx) => results[idx].status === 'fulfilled')
      .map((a) => a.id);

    if (resolvedIds.length > 0) {
      setGreenhouseAlerts((prev) => prev.filter((a) => !resolvedIds.includes(a.id)));
      setAllGlobalAlerts((prev) => prev.filter((a) => !resolvedIds.includes(a.id)));
      toast.success(`Вирішено сповіщень: ${resolvedIds.length}`);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
        <div className="flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden ml-4 p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title="Відкрити меню"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <Navbar 
              isStreaming={isConnected} 
              globalAlerts={allGlobalAlerts} 
              onSelectAlert={handleSelectAlertFromNavbar} 
            />
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'thresholds' ? (
            <Thresholds />
          ) : activeTab === 'greenhouses' ? (
            <Greenhouses setActiveTab={setActiveTab} />
          ) : activeTab === 'alerts' ? (
            <Alerts />
          ) : activeTab === 'users' && user?.role === 'Admin' ? (
            <UsersManagement />
          ) : (
            <Dashboard
              selectedGreenhouse={selectedGreenhouse}
              greenhousesCount={greenhouses.length}
              isLoadingGreenhouses={isLoading}
              userRole={user?.role}
              chartRange={chartRange}
              setChartRange={setChartRange}
              history={history}
              currentSnapshot={currentSnapshot}
              thresholds={thresholds}
              greenhouseAlerts={greenhouseAlerts}
              onDismissAlert={handleDismissAlert}
              onDismissAllAlerts={handleDismissAllAlerts}
              setActiveTab={setActiveTab}
            />
          )}
        </main>

        <Footer />
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