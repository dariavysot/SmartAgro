import React, { useState, useEffect, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Greenhouse as GreenhouseType } from '../types/greenhouse';
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
  Check,
  Filter,
  ArrowUpDown,
  RotateCcw,
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

type SortField = 'name' | 'location' | 'readings';

export const Greenhouses: React.FC = () => {
  const { greenhouses, selectedGreenhouse, setSelectedGreenhouseId, refreshGreenhouses } = useGreenhouse();
  const { user } = useAuth();

  const userRoleName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as RoleObject).name
      : user?.role;
  const isAdmin = userRoleName === 'Admin';

  // Стан панелі пошуку, фільтрації та сортування
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [isDescending, setIsDescending] = useState<boolean>(false);

  // Стан створення
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Стан редагування
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGreenhouseId, setEditingGreenhouseId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editSearchUserQuery, setEditSearchUserQuery] = useState('');

  // Стан видалення
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGreenhouse, setDeletingGreenhouse] = useState<{ id: string; name: string } | null>(null);

  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Отримання списку унікальних локацій для селектора фільтра
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    greenhouses.forEach((g) => {
      if (g.location && g.location.trim()) {
        locSet.add(g.location.trim());
      }
    });
    return Array.from(locSet);
  }, [greenhouses]);

  // Завантаження клієнтів для вибору власника (тільки Admin)
  useEffect(() => {
    if (isAdmin) {
      apiClient
        .get<UserOption[]>('/Greenhouses/users-list')
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

  // Фільтрація, пошук та сортування карток теплиць
  const processedGreenhouses = useMemo(() => {
    let result = [...greenhouses];

    // 1. Пошук
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.location && g.location.toLowerCase().includes(q))
      );
    }

    // 2. Фільтрація за локацією
    if (selectedLocationFilter !== 'all') {
      result = result.filter((g) => g.location === selectedLocationFilter);
    }

    // 3. Сортування
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' });
      } else if (sortBy === 'location') {
        comparison = (a.location || '').localeCompare(b.location || '', 'uk', { sensitivity: 'base' });
      } else if (sortBy === 'readings') {
        const countA = a.readingsCount ?? 0;
        const countB = b.readingsCount ?? 0;
        comparison = countA - countB;
      }
      return isDescending ? -comparison : comparison;
    });

    return result;
  }, [greenhouses, searchQuery, selectedLocationFilter, sortBy, isDescending]);

  // Фільтрація клієнтів для модальних вікон
  const filteredUsers = useMemo(() => {
    const q = searchUserQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [usersList, searchUserQuery]);

  const editFilteredUsers = useMemo(() => {
    const q = editSearchUserQuery.toLowerCase().trim();
    if (!q) return usersList;
    return usersList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [usersList, editSearchUserQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLocationFilter('all');
    setSortBy('name');
    setIsDescending(false);
  };

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

  const openEditModal = (gh: GreenhouseType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGreenhouseId(gh.id);
    setEditName(gh.name || '');
    setEditLocation(gh.location || '');
    setEditUserId(gh.ownerId || gh.userId || (usersList.length > 0 ? usersList[0].id : ''));
    setEditSearchUserQuery('');
    setError(null);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (gh: GreenhouseType, e: React.MouseEvent) => {
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
        const remaining = greenhouses.filter((g) => g.id !== deletingGreenhouse.id);
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
      {/* Заголовок та кнопка створення */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isAdmin ? 'Адміністрування теплиць' : 'Мої підключені теплиці'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Конфігурація обладнання, підключення нових комплексів та закріплення за клієнтами'
              : 'Список об’єктів, змонтованих та налаштованих для вашого моніторингу'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Змонтувати теплицю
          </button>
        )}
      </div>

      {/* Панель фільтрації, пошуку та сортування */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Поле пошуку */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук теплиці за назвою або сектором..."
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Фільтр за локацією */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="all">Усі сектори ({greenhouses.length})</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Сортування */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
            >
              <option value="name">Сортувати: За назвою</option>
              <option value="location">Сортувати: За сектором</option>
              <option value="readings">Сортувати: За активністю датчиків</option>
            </select>

            <button
              onClick={() => setIsDescending((prev) => !prev)}
              title={isDescending ? 'За спаданням' : 'За зростанням'}
              className="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0 font-medium"
            >
              {isDescending ? '↓ Спад' : '↑ Зрост'}
            </button>

            {(searchQuery || selectedLocationFilter !== 'all' || sortBy !== 'name' || isDescending) && (
              <button
                onClick={handleResetFilters}
                title="Скинути параметри фільтрації"
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/70 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Інформаційний рядок під фільтром */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <span>
            Відображається: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{processedGreenhouses.length}</strong> з {greenhouses.length} комплексів
          </span>
          {searchQuery && (
            <span className="truncate max-w-xs">
              Запит: <span className="text-slate-700 dark:text-slate-300 font-mono">"{searchQuery}"</span>
            </span>
          )}
        </div>
      </div>

      {/* Якщо результатів пошуку 0 */}
      {processedGreenhouses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
          <Warehouse className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Теплиць не знайдено</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Жоден тепличний комплекс не відповідає критеріям пошуку. Спробуйте змінити фільтри або пошуковий запит.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Скинути пошук
          </button>
        </div>
      ) : (
        /* Список карток */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedGreenhouses.map((gh) => {
            const isSelected = selectedGreenhouse?.id === gh.id;
            return (
              <div
                key={gh.id}
                onClick={() => setSelectedGreenhouseId(gh.id)}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none hover:scale-[1.01] ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`p-2.5 rounded-xl border transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                          : 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      <Warehouse className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => openEditModal(gh, e)}
                            title="Редагувати параметри"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => openDeleteModal(gh, e)}
                            title="Демонтувати / Видалити"
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isSelected && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold ml-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Активна
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{gh.name}</h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{gh.location || 'Локація не вказана'}</span>
                  </div>

                  {isAdmin && (gh.ownerEmail || gh.ownerUsername) && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 mt-3 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 font-medium">
                      <UserIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Клієнт: {gh.ownerUsername || gh.ownerEmail}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">ID: {gh.id.slice(0, 8)}...</span>
                  {isSelected && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Вибрано
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальне вікно створення */}
      {isAdmin && isModalOpen && (
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
                        className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || usersList.length === 0 || !selectedUserId}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Збереження...' : 'Зареєструвати об’єкт'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно редагування */}
      {isAdmin && isEditModalOpen && (
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
                      className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !editUserId}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 disabled:opacity-50 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальне вікно видалення */}
      {isAdmin && isDeleteModalOpen && deletingGreenhouse && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Підтвердження демонтажу</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Видалення об'єкта та датчиків</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Ви впевнені, що хочете видалити теплицю <strong className="text-rose-600 dark:text-rose-400">{deletingGreenhouse.name}</strong>? Усі пов'язані телеметричні дані та пороги тривог також будуть стерті.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingGreenhouse(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
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