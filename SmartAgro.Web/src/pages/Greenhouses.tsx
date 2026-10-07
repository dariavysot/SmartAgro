import React, { useState, useEffect } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Warehouse, Plus, MapPin, CheckCircle2, AlertCircle, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface RoleObject {
  id?: number | string;
  name?: string;
}

interface UserOption {
  id: string;
  username: string;
  email: string;
  role?: string | RoleObject;
}

export const Greenhouses: React.FC = () => {
  const { greenhouses, selectedGreenhouse, setSelectedGreenhouseId, refreshGreenhouses } = useGreenhouse();
  const { user } = useAuth();

  // Безпечне визначення ролі адміністратора (рядок або вкладений об'єкт)
  const userRoleName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as RoleObject).name
      : user?.role;
  const isAdmin = userRoleName === 'Admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Завантаження списку зареєстрованих користувачів для призначення (тільки для Admin)
  useEffect(() => {
    if (isAdmin) {
      apiClient.get<UserOption[]>('/Greenhouses/users-list')
        .then((res) => {
          setUsersList(res.data);
          if (res.data.length > 0) {
            setSelectedUserId(res.data[0].id);
          }
        })
        .catch((err) => {
          console.error('Не вдалося завантажити список клієнтів:', err);
        });
    }
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!selectedUserId) {
      setError('Необхідно обрати клієнта-власника для цієї теплиці');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await apiClient.post('/Greenhouses', {
        name: name.trim(),
        location: location.trim() || 'Сектор не вказано',
        userId: selectedUserId,
      });

      toast.success(`Теплицю "${name}" успішно змонтовано та закріплено за клієнтом!`);
      setName('');
      setLocation('');
      setIsModalOpen(false);

      await refreshGreenhouses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Не вдалося створити теплицю. Перевірте дані.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleDisplayName = (role?: any): string => {
    if (!role) return 'Користувач';

    // Якщо роль прийшла як об'єкт { id, name, ... }
    if (typeof role === 'object') {
      if (role.name) return role.name;
      if (role.id === 1 || role.id === '1') return 'Admin';
      return 'User';
    }

    // Якщо роль прийшла як число або числовий рядок ID (наприклад 1)
    if (role === 1 || role === '1') return 'Admin';
    if (role === 2 || role === '2') return 'User';

    return String(role);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            {isAdmin ? 'Адміністрування теплиць' : 'Мої підключені теплиці'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Конфігурація обладнання, підключення нових комплексів та закріплення за клієнтами'
              : 'Список об’єктів, змонтованих та налаштованих для вашого моніторингу'}
          </p>
        </div>

        {/* Кнопка створення доступна тільки адміну */}
        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Змонтувати теплицю
          </button>
        )}
      </div>

      {/* Список об'єктів */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {greenhouses.map((gh: any) => {
          const isSelected = selectedGreenhouse?.id === gh.id;
          return (
            <div
              key={gh.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Активна
                    </span>
                  )}
                </div>

                <h3 className="text-base font-semibold text-slate-100">{gh.name}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{gh.location || 'Локація не вказана'}</span>
                </div>

                {/* Якщо адмін - показуємо закріпленого клієнта */}
                {isAdmin && gh.ownerEmail && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 mt-3 bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Клієнт: {gh.ownerUsername || gh.ownerEmail}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">ID: {gh.id.slice(0, 8)}...</span>
                {!isSelected && (
                  <button
                    onClick={() => setSelectedGreenhouseId(gh.id)}
                    className="px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    Вибрати
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальне вікно монтажу теплиці (Лише для Адміністратора) */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Warehouse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Монтаж нового комплексу</h3>
                <p className="text-xs text-slate-400">Реєстрація IoT-станції та закріплення за клієнтом</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Клієнт / Власник теплиці
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900">
                      {u.username} ({u.email}) — [{getRoleDisplayName(u.role)}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Назва комплексу / Секції
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="наприклад: Теплиця №3 (Суниця)"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Локація / Сектор
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="наприклад: Сектор В, Ряд 1"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Збереження...' : 'Зареєструвати об’єкт'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};