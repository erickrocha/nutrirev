import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Building, CheckCircle, Edit2, Plus, RefreshCw, Shield, UserPlus, XCircle } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { Button } from '../../components/atoms/Button';
import { fetchUsers } from '../../store/userSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { enumLabel, ROLES } from '../../utils/enums';
import { tenantIdOf } from '../../utils/userForm';

export const UserListPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { usersList, loading, error } = useAppSelector((state) => state.user);
  const tenantsList = useAppSelector((state) => state.tenant.tenantsList);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isSysAdmin = currentUser?.role === ROLES.SYS_ADMIN;
  const ownTenantId = currentUser ? tenantIdOf(currentUser) : null;

  const load = () => { dispatch(fetchUsers()); };
  useEffect(() => { dispatch(fetchUsers()); dispatch(fetchTenants()); }, [dispatch]);

  // A clínica só enxerga os próprios usuários; o SysAdmin vê todos.
  const visible = isSysAdmin ? usersList : usersList.filter((user) => tenantIdOf(user) === ownTenantId);
  const tenantName = (id: number | null) => (id ? tenantsList.find((tenant) => tenant.id === id)?.name ?? `Tenant #${id}` : t('users.noTenantGlobal'));

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('users.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('users.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{isSysAdmin ? t('users.subtitleSysAdmin') : t('users.subtitleOwner')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={newPath(PATHS.USERS)}><Plus size={18} />{t('users.addUser')}</Button>
        </div>
      </header>

      {error !== null && <ErrorAlert message={error || t('users.errorLoading')} onRetry={load} />}

      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
        {loading && usersList.length === 0 ? (
          <p role="status" className="flex items-center justify-center gap-2 p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('users.loadingUsers')}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-[var(--text-body)]">
            <UserPlus size={36} />
            <p className="m-0">{t('users.noUsersFound')}</p>
            <Button to={newPath(PATHS.USERS)}><Plus size={16} />{t('users.addFirstUser')}</Button>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['users.nameEmail', 'users.permission', 'users.tenant', 'common.status'].map((key) => <th key={key} className="px-4 py-3">{t(key)}</th>)}
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3"><div className="flex flex-col"><span className="font-semibold">{user.name || t('common.noName')}</span><span className="text-[.8rem] text-slate-500">{user.email}</span></div></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-[2px] text-[.8rem]"><Shield size={12} />{enumLabel(t, 'role', user.role)}</span></td>
                  <td className="px-4 py-3"><span className="inline-flex items-center gap-1 text-[.85rem]"><Building size={12} />{tenantName(tenantIdOf(user))}</span></td>
                  <td className="px-4 py-3">
                    {user.enabled !== false
                      ? <span className="inline-flex items-center gap-1 text-[.82rem] font-semibold text-emerald-600"><CheckCircle size={12} />{t('common.active')}</span>
                      : <span className="inline-flex items-center gap-1 text-[.82rem] font-semibold text-slate-500"><XCircle size={12} />{t('common.inactive')}</span>}
                  </td>
                  <td className="px-4 py-3 text-right"><Button variant="outline" to={editPath(PATHS.USERS, user.id)} title={t('users.editUser')}><Edit2 size={16} />{t('common.edit')}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
