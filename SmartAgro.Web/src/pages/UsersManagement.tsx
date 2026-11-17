import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { UserFormModal } from '../components/users/UserFormModal';
import { UserCardsMobile } from '../components/users/UserCardsMobile';
import { Users, UserPlus, Shield, User, Edit3, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface UserItem {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  createdAt: string;
  assignedGreenhousesCount: number;
}

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Стан модального вікна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'User' | 'Admin'>('User');
  const [formPassword, setFormPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<UserItem[]>('/Users');
      setUsers(response.data);
    } catch {
      toast.error('Помилка завантаження користувачів.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormEmail('');
    setFormRole('User');
    setFormPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormPassword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingUser) {
        await apiClient.put(`/Users/${editingUser.id}`, {
          username: formUsername,
          email: formEmail,
          role: formRole,
          newPassword: formPassword.trim() || null,
        });
        toast.success('Дані користувача оновлено!');
      } else {
        await apiClient.post('/Users', {
          username: formUsername,
          email: formEmail,
          password: formPassword,
          role: formRole,
        });
        toast.success('Користувача успішно створено!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Помилка збереження даних.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Ви дійсно бажаєте видалити користувача «${name}»?`)) return;

    try {
      await apiClient.delete(`/Users/${id}`);
      toast.success('Користувача видалено');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Не вдалося видалити користувача');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Керування користувачами</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Створення акаунтів персоналу, призначення ролей доступу та скидання паролів
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Новий співробітник</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* Мобільні картки (винесені в компонент) */}
          <UserCardsMobile users={users} onEdit={openEditModal} onDelete={handleDelete} />

          {/* Десктопна таблиця */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Користувач</th>
                    <th className="px-6 py-4">Електронна пошта</th>
                    <th className="px-6 py-4">Роль</th>
                    <th className="px-6 py-4">Теплиць</th>
                    <th className="px-6 py-4">Дата реєстрації</th>
                    <th className="px-6 py-4 text-right">Дії</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold">{u.username}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            u.role === 'Admin'
                              ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20'
                              : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
                          }`}
                        >
                          {u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {u.role === 'Admin' ? 'Адміністратор' : 'Оператор'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{u.assignedGreenhousesCount}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('uk-UA')}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Редагувати"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="Видалити"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        isEditing={!!editingUser}
        formUsername={formUsername}
        setFormUsername={setFormUsername}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formRole={formRole}
        setFormRole={setFormRole}
        formPassword={formPassword}
        setFormPassword={setFormPassword}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};