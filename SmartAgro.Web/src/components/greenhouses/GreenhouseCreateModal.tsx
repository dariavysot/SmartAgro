import React, { useState, useMemo } from 'react';
import { Warehouse, Search, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

interface UserOption {
  id: string;
  username: string;
  email: string;
}

interface GreenhouseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: UserOption[];
  onCreated: () => Promise<void>;
}

export const GreenhouseCreateModal: React.FC<GreenhouseCreateModalProps> = ({
  isOpen,
  onClose,
  usersList,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(usersList[0]?.id || '');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchUserQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usersList, searchUserQuery]);

  if (!isOpen) return null;

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
      onClose();
      await onCreated();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Не вдалося створити теплицю. Перевірте дані.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Монтаж нового комплексу</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Реєстрація IoT-станції та закріплення за клієнтом</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Клієнт / Власник теплиці
            </label>

            {usersList.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 rounded-xl">
                Немає доступних зареєстрованих клієнтів для прив'язки.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="Пошук за ім'ям або email..."
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/60 dark:bg-slate-950/40">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-3">Клієнтів не знайдено</p>
                  ) : (
                    filteredUsers.map((u) => {
                      const isChosen = selectedUserId === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                            isChosen
                              ? 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{u.username}</span>
                            <span className="text-[11px] text-slate-500 ml-1.5">({u.email})</span>
                          </div>
                          {isChosen && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Назва комплексу / Секції
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="наприклад: Головна Теплиця (Сектор A)"
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Локація / Сектор
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="наприклад: Сектор А, Ряд 2"
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting || usersList.length === 0 || !selectedUserId}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? 'Збереження...' : 'Зареєструвати об’єкт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};