import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import toast from 'react-hot-toast';

interface GreenhouseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  greenhouse: { id: string; name: string } | null;
  onDeleted: (deletedId: string) => Promise<void> | void;
}

export const GreenhouseDeleteModal: React.FC<GreenhouseDeleteModalProps> = ({
  isOpen,
  onClose,
  greenhouse,
  onDeleted,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !greenhouse) return null;

  const handleDelete = async () => {
    try {
      setIsSubmitting(true);
      await apiClient.delete(`/Greenhouses/${greenhouse.id}`);

      toast.success(`Теплицю "${greenhouse.name}" успішно демонтовано та видалено!`);
      onClose();
      await onDeleted(greenhouse.id);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Не вдалося видалити теплицю.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          Ви впевнені, що хочете видалити теплицю <strong className="text-rose-600 dark:text-rose-400">{greenhouse.name}</strong>? Усі пов'язані телеметричні дані та пороги тривог також будуть стерті.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
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
  );
};