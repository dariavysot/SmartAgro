import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useGreenhouse } from '../context/GreenhouseContext';
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

      {/* АДАПТИВНИЙ ВИГЛЯД: Вертикальні картки для мобільних пристроїв */}
      <div className="md:hidden space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            Жодної тривоги за заданими критеріями не знайдено.
          </div>
        ) : (
          filteredAlerts.map((item) => (
            <div key={item.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500">#{item.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  item.severity.toLowerCase() === 'critical'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                }`}>
                  {item.severity}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  <span>{item.greenhouseName}</span>
                </div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {item.message}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">
                  {new Date(item.createdAt).toLocaleString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 font-semibold ${
                    item.isResolved 
                      ? 'text-emerald-700 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400 animate-pulse'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${item.isResolved ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                    {item.isResolved ? 'Вирішено' : 'Активно'}
                  </span>

                  {!item.isResolved && (
                    <button
                      onClick={() => handleResolve(item.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      Вирішити
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* АДАПТИВНИЙ ВИГЛЯД: Класична таблиця для десктопів (від md і вище) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm dark:shadow-xl transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Час фіксації</th>
                <th className="py-3.5 px-4">Теплиця</th>
                <th className="py-3.5 px-4">Повідомлення</th>
                <th className="py-3.5 px-4">Рівень</th>
                <th className="py-3.5 px-4">Стан</th>
                <th className="py-3.5 px-4 text-right">Дія</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                    Жодної тривоги за заданими критеріями не знайдено.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 dark:text-slate-500">#{item.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString([], {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-700 dark:text-emerald-400 font-semibold">{item.greenhouseName}</td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 dark:text-slate-200 font-medium">{item.message}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        item.severity.toLowerCase() === 'critical'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${
                        item.isResolved 
                          ? 'text-emerald-700 dark:text-emerald-400' 
                          : 'text-rose-600 dark:text-rose-400 animate-pulse'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isResolved ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                        {item.isResolved ? 'Вирішено' : 'Активно'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!item.isResolved ? (
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 rounded-lg transition-all cursor-pointer shadow-xs"
                        >
                          Вирішити
                        </button>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] font-medium">Закрито</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}