import React from 'react';
import { Shield, User, Edit3, Trash2 } from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  createdAt: string;
  assignedGreenhousesCount: number;
}

interface UserCardsMobileProps {
  users: UserItem[];
  onEdit: (u: UserItem) => void;
  onDelete: (id: string, name: string) => void;
}

export const UserCardsMobile: React.FC<UserCardsMobileProps> = ({ users, onEdit, onDelete }) => {
  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
        Користувачів не знайдено.
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-3">
      {users.map((u) => (
        <div key={u.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                {u.username[0]?.toUpperCase()}
              </div>
              <div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white block">{u.username}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</span>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                u.role === 'Admin'
                  ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
              }`}
            >
              {u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {u.role === 'Admin' ? 'Адмін' : 'Оператор'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <span>Теплиць закріплено: </span>
              <strong className="text-slate-800 dark:text-slate-200">{u.assignedGreenhousesCount}</strong>
            </div>
            <div>
              <span>Реєстрація: </span>
              <span>{new Date(u.createdAt).toLocaleDateString('uk-UA')}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={() => onEdit(u)}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Редагувати</span>
            </button>
            <button
              onClick={() => onDelete(u.id, u.username)}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-300 dark:border-rose-500/20 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Видалити</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};