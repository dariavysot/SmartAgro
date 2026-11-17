import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Search, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

interface UserOption {
  id: string;
  username: string;
  email: string;
}

interface GreenhouseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  greenhouse: { id: string; name: string; location: string; ownerId?: string; userId?: string } | null;
  usersList: UserOption[];
  onUpdated: () => Promise<void>;
}

export const GreenhouseEditModal: React.FC<GreenhouseEditModalProps> = ({
  isOpen,
  onClose,
  greenhouse,
  usersList,
  onUpdated,
}) => {
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editSearchUserQuery, setEditSearchUserQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (greenhouse) {
      setEditName(greenhouse.name || '');
      setEditLocation(greenhouse.location || '');
      setEditUserId(greenhouse.ownerId || greenhouse.userId || (usersList[0]?.id ?? ''));
      setEditSearchUserQuery('');
      setError(null);
    }
  }, [greenhouse, usersList]);

  const editFilteredUsers = useMemo(() => {
    const q = editSearchUserQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usersList, editSearchUserQuery]);

  if (!isOpen || !greenhouse) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await apiClient.put(`/Greenhouses/${greenhouse.id}`, {
        name: editName.trim(),
        location: editLocation.trim() || 'Сектор не вказано',
        userId: editUserId || undefined,
      });

      toast.success('Параметри теплиці успішно оновлено!');
      onClose();
      await onUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Не вдалося оновити теплицю. Перевірте дані.';
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
            <Pencil className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Редагування комплексу</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Зміна назви, сектора або власника</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Клієнт / Власник теплиці
            </label>

            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={editSearchUserQuery}
                  onChange={(e) => setEditSearchUserQuery(e.target.value)}
                  placeholder="Пошук за ім'ям або email..."
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50/60 dark:bg-slate-950/40">
                {editFilteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">Клієнтів не знайдено</p>
                ) : (
                  editFilteredUsers.map((u) => {
                    const isChosen = editUserId === u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => setEditUserId(u.id)}
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
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Назва комплексу / Секції
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="наприклад: Головна Теплиця"
              className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Локація / Сектор
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="наприклад: Сектор А"
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
              disabled={isSubmitting || !editUserId}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};