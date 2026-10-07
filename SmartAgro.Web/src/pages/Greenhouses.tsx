import React, { useState, useEffect, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import {
  Warehouse,
  Plus,
  MapPin,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Pencil,
  Trash2,
  Search,
  Check
} from 'lucide-react';
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

  // Безпечне визначення ролі адміністратора
  const userRoleName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as RoleObject).name
      : user?.role;
  const isAdmin = userRoleName === 'Admin';

  // Стан для створення
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Стан для редагування
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGreenhouseId, setEditingGreenhouseId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editSearchUserQuery, setEditSearchUserQuery] = useState('');

  // Стан для видалення
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGreenhouse, setDeletingGreenhouse] = useState<{ id: string; name: string } | null>(null);

  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Завантаження списку клієнтів (тільки для Admin)
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

  // Фільтрація клієнтів за ім'ям або поштою при створенні
  const filteredUsers = useMemo(() => {
    const q = searchUserQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [usersList, searchUserQuery]);

  // Фільтрація клієнтів при редагуванні
  const editFilteredUsers = useMemo(() => {
    const q = editSearchUserQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [usersList, editSearchUserQuery]);

  // Відкриття форми створення
  const openCreateModal = () => {
    setError(null);
    setName('');
    setLocation('');
    setSearchUserQuery('');
    if (usersList.length > 0) {
      setSelectedUserId(usersList[0].id);
    }
    setIsModalOpen(true);
  };

  // Відкриття форми редагування
  const openEditModal = (gh: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGreenhouseId(gh.id);
    setEditName(gh.name || '');
    setEditLocation(gh.location || '');
    setEditUserId(gh.ownerId || gh.userId || (usersList.length > 0 ? usersList[0].id : ''));
    setEditSearchUserQuery('');
    setError(null);
    setIsEditModalOpen(true);
  };

  // Відкриття підтвердження видалення
  const openDeleteModal = (gh: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingGreenhouse({ id: gh.id, name: gh.name });
    setIsDeleteModalOpen(true);
  };

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGreenhouseId || !editName.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await apiClient.put(`/Greenhouses/${editingGreenhouseId}`, {
        name: editName.trim(),
        location: editLocation.trim() || 'Сектор не вказано',
        userId: editUserId || undefined,
      });

      toast.success('Параметри теплиці успішно оновлено!');
      setIsEditModalOpen(false);
      setEditingGreenhouseId(null);

      await refreshGreenhouses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Не вдалося оновити теплицю. Перевірте дані.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGreenhouse) return;

    try {
      setIsSubmitting(true);
      await apiClient.delete(`/Greenhouses/${deletingGreenhouse.id}`);

      toast.success(`Теплицю "${deletingGreenhouse.name}" успішно демонтовано та видалено!`);

      if (selectedGreenhouse?.id === deletingGreenhouse.id) {
        const remaining = greenhouses.filter((g: any) => g.id !== deletingGreenhouse.id);
        if (remaining.length > 0) {
          setSelectedGreenhouseId(remaining[0].id);
        }
      }

      setIsDeleteModalOpen(false);
      setDeletingGreenhouse(null);

      await refreshGreenhouses();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Не вдалося видалити теплицю.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
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
            onClick={openCreateModal}
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

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => openEditModal(gh, e)}
                          title="Редагувати параметри"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => openDeleteModal(gh, e)}
                          title="Демонтувати / Видалити"
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isSelected && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium ml-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Активна
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-base font-semibold text-slate-100">{gh.name}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{gh.location || 'Локація не вказана'}</span>
                </div>

                {isAdmin && (gh.ownerEmail || gh.ownerUsername) && (
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

      {/* Модальне вікно створення нової теплиці з живим пошуком клієнта */}
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
              {/* Пошук та вибір клієнта */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Клієнт / Власник теплиці
                </label>

                {usersList.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                    Немає доступних зареєстрованих клієнтів для прив'язки.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {/* Поле пошуку за ім'ям або email */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        placeholder="Пошук за ім'ям або email..."
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    {/* Інтерактивний список для швидкого вибору */}
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar border border-slate-800/80 rounded-xl p-1.5 bg-slate-950/40">
                      {filteredUsers.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-3">Клієнтів не знайдено</p>
                      ) : (
                        filteredUsers.map((u) => {
                          const isChosen = selectedUserId === u.id;
                          return (
                            <div
                              key={u.id}
                              onClick={() => setSelectedUserId(u.id)}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                                isChosen
                                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                  : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="truncate mr-2">
                                <span className="font-medium text-slate-200">{u.username}</span>
                                <span className="text-[11px] text-slate-500 ml-1.5">({u.email})</span>
                              </div>
                              {isChosen && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
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
                  disabled={isSubmitting || usersList.length === 0 || !selectedUserId}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Збереження...' : 'Зареєструвати об’єкт'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно редагування теплиці з живим пошуком */}
      {isAdmin && isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Редагування комплексу</h3>
                <p className="text-xs text-slate-400">Зміна назви, сектора або власника</p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Клієнт / Власник теплиці
                </label>

                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={editSearchUserQuery}
                      onChange={(e) => setEditSearchUserQuery(e.target.value)}
                      placeholder="Пошук за ім'ям або email..."
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar border border-slate-800/80 rounded-xl p-1.5 bg-slate-950/40">
                    {editFilteredUsers.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-3">Клієнтів не знайдено</p>
                    ) : (
                      editFilteredUsers.map((u) => {
                        const isChosen = editUserId === u.id;
                        return (
                          <div
                            key={u.id}
                            onClick={() => setEditUserId(u.id)}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                              isChosen
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                                : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <span className="font-medium text-slate-200">{u.username}</span>
                              <span className="text-[11px] text-slate-500 ml-1.5">({u.email})</span>
                            </div>
                            {isChosen && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Назва комплексу / Секції
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="наприклад: Сектор В, Ряд 1"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editUserId}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно підтвердження видалення теплиці */}
      {isAdmin && isDeleteModalOpen && deletingGreenhouse && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Підтвердження демонтажу</h3>
                <p className="text-xs text-slate-400">Видалення об'єкта та датчиків</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ви впевнені, що хочете видалити теплицю <strong className="text-rose-400">{deletingGreenhouse.name}</strong>? Усі пов'язані телеметричні дані та пороги тривог також будуть стерті.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingGreenhouse(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Видалення...' : 'Так, видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};