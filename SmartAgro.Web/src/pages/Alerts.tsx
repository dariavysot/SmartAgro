import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useGreenhouse } from '../context/GreenhouseContext';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Flame, 
  RefreshCw, 
  Pin,
  Filter
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

  // Найновіша тривога для закріплення зверху (пріоритет: найсвіжіша активна, або остання зафіксована)
  const pinnedAlert = useMemo(() => {
    if (alerts.length === 0) return null;
    const firstActive = alerts.find((a) => !a.isResolved);
    return firstActive || alerts[0];
  }, [alerts]);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
            Журнал тривог та інцидентів
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Усі випадки відхилення мікроклімату фіксуються із незворотним штампом часу.
            {selectedGreenhouse ? ` Фільтр за: ${selectedGreenhouse.name}` : ' Відображено всі сектори'}
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 rounded-xl transition-all cursor-pointer active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Оновити
        </button>
      </div>

      {/* ЗАКРІПЛЕНА ТРИВОГА ЗВЕРХУ (PINNED BANNER) */}
      {pinnedAlert && (
        <div className={`relative p-5 rounded-3xl border transition-all shadow-xl overflow-hidden ${
          !pinnedAlert.isResolved
            ? 'bg-gradient-to-r from-rose-950/60 via-slate-900/80 to-slate-900 border-rose-500/40 shadow-rose-950/20'
            : 'bg-slate-900/60 border-slate-800 shadow-slate-950/30'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl border ${
                !pinnedAlert.isResolved
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                {!pinnedAlert.isResolved ? <Flame className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    <Pin className="w-3 h-3" /> Останній зафіксований інцидент
                  </span>
                  <span className="text-xs text-slate-400">• {pinnedAlert.greenhouseName}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100">{pinnedAlert.message}</h3>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Зафіксовано: {new Date(pinnedAlert.createdAt).toLocaleString()}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    pinnedAlert.isResolved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {pinnedAlert.isResolved ? 'Вирішено' : 'Активна тривога'}
                  </span>
                </div>
              </div>
            </div>

            {!pinnedAlert.isResolved && (
              <button
                onClick={() => handleResolve(pinnedAlert.id)}
                className="px-3.5 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              >
                Позначити вирішеною
              </button>
            )}
          </div>
        </div>
      )}

      {/* Панель фільтрів */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Фільтри журналу:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">Усі рівні небезпеки</option>
            <option value="Critical">Лише Критичні</option>
            <option value="Warning">Лише Попередження</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">Усі статуси</option>
            <option value="Active">Лише Активні</option>
            <option value="Resolved">Лише Вирішені</option>
          </select>
        </div>
      </div>

      {/* Таблиця незмінної історії */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
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
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    Жодної тривоги за заданими критеріями не знайдено.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">#{item.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString([], {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-medium">{item.greenhouseName}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-200">{item.message}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.severity.toLowerCase() === 'critical'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 ${
                        item.isResolved ? 'text-emerald-400' : 'text-rose-400 animate-pulse'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isResolved ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {item.isResolved ? 'Вирішено' : 'Активно'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!item.isResolved ? (
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-all cursor-pointer"
                        >
                          Вирішити
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Зафіксовано</span>
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