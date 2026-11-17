import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useGreenhouse } from '../context/GreenhouseContext';
import { AlertsTable } from '../components/alerts/AlertsTable';
import { AlertsMobileList } from '../components/alerts/AlertsMobileList';
import { 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw, 
  Filter,
  ShieldAlert,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface AlertLogRecord {
  id: number;
  greenhouseId: string;
  greenhouseName: string;
  message: string;
  severity: 'Critical' | 'Warning' | string;
  isResolved: boolean;
  createdAt: string;
}

export function Alerts() {
  const { selectedGreenhouse } = useGreenhouse();
  const [alerts, setAlerts] = useState<AlertLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Critical' | 'Warning'>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Resolved'>('All');

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const url = selectedGreenhouse?.id 
        ? `/Alerts/history?greenhouseId=${selectedGreenhouse.id}`
        : '/Alerts/history';
      const res = await apiClient.get<AlertLogRecord[]>(url);
      setAlerts(res.data);
    } catch {
      toast.error('Не вдалося завантажити історію тривог');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedGreenhouse?.id]);

  const handleResolve = async (id: number) => {
    try {
      await apiClient.post(`/Alerts/${id}/resolve`);
      toast.success(`Тривогу #${id} вирішено`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isResolved: true } : a))
      );
    } catch {
      toast.error('Помилка оновлення статусу');
    }
  };

  // Фільтрація списку для історії
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSeverity = filterSeverity === 'All' || a.severity.toLowerCase() === filterSeverity.toLowerCase();
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Active' && !a.isResolved) ||
        (filterStatus === 'Resolved' && a.isResolved);
      return matchesSeverity && matchesStatus;
    });
  }, [alerts, filterSeverity, filterStatus]);

  // Підрахунок швидкої статистики
  const stats = useMemo(() => {
    const activeCount = alerts.filter(a => !a.isResolved).length;
    const criticalCount = alerts.filter(a => !a.isResolved && a.severity.toLowerCase() === 'critical').length;
    const totalCount = alerts.length;
    return { activeCount, criticalCount, totalCount };
  }, [alerts]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Заголовок та кнопка оновлення */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
            Журнал тривог та інцидентів
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Усі випадки відхилення мікроклімату фіксуються із незворотним штампом часу.
            {selectedGreenhouse ? ` Фільтр за: ${selectedGreenhouse.name}` : ' Відображено всі сектори'}
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Оновити
        </button>
      </div>

      {/* Зведені міні-картки статистики */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Активні тривоги</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stats.activeCount}</p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Критичні нерозв'язані</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stats.criticalCount}</p>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Всього в історії</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">{stats.totalCount}</p>
          </div>
        </div>
      </div>

      {/* Панель фільтрів */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm transition-colors">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Фільтри журналу:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer font-medium"
          >
            <option value="All">Усі рівні небезпеки</option>
            <option value="Critical">Лише Критичні</option>
            <option value="Warning">Лише Попередження</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer font-medium"
          >
            <option value="All">Усі статуси</option>
            <option value="Active">Лише Активні</option>
            <option value="Resolved">Лише Вирішені</option>
          </select>
        </div>
      </div>

      {/* Використовуємо винесені підкомпоненти */}
      <AlertsMobileList alerts={filteredAlerts} onResolve={handleResolve} />
      <AlertsTable alerts={filteredAlerts} onResolve={handleResolve} />
    </div>
  );
}