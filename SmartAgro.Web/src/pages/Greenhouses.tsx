import React, { useState, useEffect, useMemo } from 'react';
import { useGreenhouse } from '../context/GreenhouseContext';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Greenhouse as GreenhouseType } from '../types/greenhouse';
import { GreenhouseCreateModal } from '../components/greenhouses/GreenhouseCreateModal';
import { GreenhouseEditModal } from '../components/greenhouses/GreenhouseEditModal';
import { GreenhouseDeleteModal } from '../components/greenhouses/GreenhouseDeleteModal';
import {
  Warehouse,
  Plus,
  MapPin,
  CheckCircle2,
  User as UserIcon,
  Pencil,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  Sliders,
} from 'lucide-react';

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

interface GreenhousesProps {
  setActiveTab?: (tab: string) => void;
}

export const Greenhouses: React.FC<GreenhousesProps> = ({ setActiveTab }) => {
  const { greenhouses, selectedGreenhouse, setSelectedGreenhouseId, refreshGreenhouses } = useGreenhouse();
  const { user } = useAuth();

  const userRoleName =
    typeof user?.role === 'object' && user?.role !== null
      ? (user.role as RoleObject).name
      : user?.role;
  const isAdmin = userRoleName === 'Admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [isDescending, setIsDescending] = useState<boolean>(false);

  // Стани модалок
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGreenhouse, setEditingGreenhouse] = useState<GreenhouseType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGreenhouse, setDeletingGreenhouse] = useState<{ id: string; name: string } | null>(null);

  const [usersList, setUsersList] = useState<UserOption[]>([]);

  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    greenhouses.forEach((g) => {
      if (g.location && g.location.trim()) {
        locSet.add(g.location.trim());
      }
    });
    return Array.from(locSet);
  }, [greenhouses]);

  useEffect(() => {
    if (isAdmin) {
      apiClient
        .get<UserOption[]>('/Users')
        .then((res) => setUsersList(res.data))
        .catch((err) => console.error('Не вдалося завантажити список клієнтів:', err));
    }
  }, [isAdmin]);

  const processedGreenhouses = useMemo(() => {
    let result = [...greenhouses];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.location && g.location.toLowerCase().includes(q))
      );
    }

    if (selectedLocationFilter !== 'all') {
      result = result.filter((g) => g.location === selectedLocationFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name, 'uk', { sensitivity: 'base' });
      } else if (sortBy === 'location') {
        comparison = (a.location || '').localeCompare(b.location || '', 'uk', { sensitivity: 'base' });
      } else if (sortBy === 'readings') {
        comparison = (a.readingsCount ?? 0) - (b.readingsCount ?? 0);
      }
      return isDescending ? -comparison : comparison;
    });

    return result;
  }, [greenhouses, searchQuery, selectedLocationFilter, sortBy, isDescending]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLocationFilter('all');
    setSortBy('name');
    setIsDescending(false);
  };

  const handleCardClick = (ghId: string) => {
    setSelectedGreenhouseId(ghId);
    if (setActiveTab) setActiveTab('dashboard');
  };

  const handleOpenThresholds = (ghId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedGreenhouseId(ghId);
    if (setActiveTab) setActiveTab('thresholds');
  };

  const handleDeleted = async (deletedId: string) => {
    if (selectedGreenhouse?.id === deletedId) {
      const remaining = greenhouses.filter((g) => g.id !== deletedId);
      if (remaining.length > 0) setSelectedGreenhouseId(remaining[0].id);
    }
    await refreshGreenhouses();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
            onClick={() => setIsModalOpen(true)}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Змонтувати теплицю
          </button>
        )}
      </div>

      {/* Фільтри та пошук */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3 transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук теплиці за назвою або сектором..."
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="lg:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Усі сектори ({greenhouses.length})</option>
              {availableLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="name">Сортувати: За назвою</option>
              <option value="location">Сортувати: За сектором</option>
              <option value="readings">Сортувати: За активністю</option>
            </select>

            <button
              onClick={() => setIsDescending((prev) => !prev)}
              className="px-2.5 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 cursor-pointer shrink-0 font-medium"
            >
              {isDescending ? '↓ Спад' : '↑ Зрост'}
            </button>

            {(searchQuery || selectedLocationFilter !== 'all' || sortBy !== 'name' || isDescending) && (
              <button
                onClick={handleResetFilters}
                className="p-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Список теплиць */}
      {processedGreenhouses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3 shadow-sm">
          <Warehouse className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Теплиць не знайдено</h3>
          <button
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
          >
            Скинути пошук
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedGreenhouses.map((gh) => {
            const isSelected = selectedGreenhouse?.id === gh.id;
            return (
              <div
                key={gh.id}
                onClick={() => handleCardClick(gh.id)}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none hover:scale-[1.01] ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2.5 rounded-xl border bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <Warehouse className="w-5 h-5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleOpenThresholds(gh.id, e)}
                        title="Межі теплиці"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg cursor-pointer"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingGreenhouse(gh);
                              setIsEditModalOpen(true);
                            }}
                            title="Редагувати"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingGreenhouse({ id: gh.id, name: gh.name });
                              setIsDeleteModalOpen(true);
                            }}
                            title="Видалити"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isSelected && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold ml-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Активна
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{gh.name}</h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{gh.location || 'Локація не вказана'}</span>
                  </div>

                  {isAdmin && (gh.ownerEmail || gh.ownerUsername) && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 mt-3 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-medium">
                      <UserIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Клієнт: {gh.ownerUsername || gh.ownerEmail}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">ID: {gh.id.slice(0, 8)}...</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальні вікна */}
      <GreenhouseCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        usersList={usersList}
        onCreated={refreshGreenhouses}
      />

      <GreenhouseEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        greenhouse={editingGreenhouse}
        usersList={usersList}
        onUpdated={refreshGreenhouses}
      />

      <GreenhouseDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        greenhouse={deletingGreenhouse}
        onDeleted={handleDeleted}
      />
    </div>
  );
};