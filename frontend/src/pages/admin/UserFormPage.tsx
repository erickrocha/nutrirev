import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, UserPlus, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { FormCard } from '../../components/molecules/FormCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { clearUserError, createUser, fetchUsers, updateUser } from '../../store/userSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { enumLabel, ROLES } from '../../utils/enums';
import { newUserDefaults, tenantIdOf, toUserPayload, userToForm, type UserFormValues } from '../../utils/userForm';
import type { AppUser } from '../../types/user';

interface FormProps {
  defaults: UserFormValues;
  existing?: AppUser;
  isSysAdmin: boolean;
  ownTenantName: string;
  onSubmit: (values: UserFormValues) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const UserForm = ({ defaults, existing, isSysAdmin, ownTenantName, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { loading, error } = useAppSelector((state) => state.user);
  const tenantsList = useAppSelector((state) => state.tenant.tenantsList);
  const editing = Boolean(existing);

  const schema = useMemo(() => yup.object({
    name: yup.string().trim().required(t('users.fullName')),
    email: yup.string().trim().email(t('order.errors.email')).required(t('users.corporateEmail')),
    password: editing ? yup.string() : yup.string().required(t('users.passwordRequired')),
  }), [editing, t]);
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormValues>({ resolver: yupResolver(schema) as never, defaultValues: defaults });
  const title = editing ? t('users.editUser') : t('users.addNewUser');

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormCard
        header={<h3 className="m-0 flex items-center gap-2 text-[1.1rem] text-[var(--accent-primary)]"><UserPlus size={18} />{title}</h3>}
        footer={
          <>
            <Button variant="outline" to={PATHS.USERS}><X size={16} />{t('common.cancel')}</Button>
            <Button type="submit" disabled={loading}><Save size={18} />{loading ? t('common.saving') : editing ? t('common.saveChanges') : t('users.registerUser')}</Button>
          </>
        }
      >
        {error !== null && <div role="alert" className="mb-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{error || t('users.saveError')}</div>}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <TextField id="user-name" label={t('users.fullName')} placeholder={t('users.fullNamePlaceholder')} error={errors.name?.message} {...register('name')} />
          <TextField id="user-email" type="email" label={t('users.corporateEmail')} placeholder={t('users.emailPlaceholder')} error={errors.email?.message} {...register('email')} />
          <TextField id="user-password" type="password" autoComplete="new-password" label={editing ? t('users.newPassword') : t('users.accessPassword')} error={errors.password?.message} {...register('password')} />
          <SelectField id="user-role" label={t('users.accessLevel')} {...register('role')}>
            <option value={ROLES.TENANT_USER}>{t('users.tenantUser')}</option>
            <option value={ROLES.TENANT_OWNER}>{t('users.tenantOwnerRole')}</option>
            <option value={ROLES.USER}>{t('users.standardUser')}</option>
            {isSysAdmin && <option value={ROLES.SYS_ADMIN}>{enumLabel(t, 'role', ROLES.SYS_ADMIN)}</option>}
          </SelectField>
          {isSysAdmin ? (
            <SelectField id="user-tenant" label={t('users.associatedTenant')} {...register('tenantId')}>
              <option value="">{t('users.noTenantGlobal')}</option>
              {tenantsList.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </SelectField>
          ) : (
            <TextField id="user-tenant" label={t('users.associatedTenant')} value={ownTenantName} readOnly disabled />
          )}
          <label className="flex items-center gap-2 self-end pb-3 text-[.9rem]">
            <input type="checkbox" className="h-5 w-5" {...register('enabled')} />
            <span>{t('users.activeInSystem')}</span>
          </label>
        </div>
      </FormCard>
    </form>
  );
};

export const UserFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const userId = id ? Number(id) : undefined;
  const editing = userId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { usersList, loading, error } = useAppSelector((state) => state.user);
  const { tenantsList, loading: tenantsLoading } = useAppSelector((state) => state.tenant);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isSysAdmin = currentUser?.role === ROLES.SYS_ADMIN;
  const ownTenantId = currentUser ? tenantIdOf(currentUser) : null;
  const [loaded, setLoaded] = useState(false);

  const load = () => { Promise.all([dispatch(fetchUsers()), dispatch(fetchTenants())]).then(() => setLoaded(true)); };
  useEffect(() => {
    dispatch(clearUserError());
    Promise.all([dispatch(fetchUsers()), dispatch(fetchTenants())]).then(() => setLoaded(true));
  }, [dispatch]);

  const existing = editing ? usersList.find((user) => user.id === userId) : undefined;
  const ownTenantName = ownTenantId ? tenantsList.find((tenant) => tenant.id === ownTenantId)?.name ?? `Tenant #${ownTenantId}` : t('users.noTenantGlobal');

  const save = async (values: UserFormValues) => {
    const userData = toUserPayload(values, existing);
    const saved = editing
      ? updateUser.fulfilled.match(await dispatch(updateUser({ id: userId, userData })))
      : createUser.fulfilled.match(await dispatch(createUser(userData)));
    if (saved) navigate(PATHS.USERS);
  };

  const title = editing ? t('users.editUser') : t('users.addNewUser');
  const notFound = editing && loaded && !loading && !existing;
  const loadFailed = loaded && !loading && error !== null && usersList.length === 0;
  const ready = loaded && !loading && !tenantsLoading && !loadFailed && !notFound;
  const defaults = existing ? userToForm(existing, isSysAdmin, ownTenantId) : newUserDefaults(isSysAdmin, tenantsList[0]?.id, ownTenantId);

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('users.title'), to: PATHS.USERS }, { label: title }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{title}</h2>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('users.loadingUsers')}</p>}
      {loadFailed && <ErrorAlert message={error || t('users.errorLoading')} onRetry={load} />}
      {notFound && <ErrorAlert message={t('users.noUsersFound')} onRetry={load} />}
      {ready && <UserForm key={existing?.id ?? 'new'} defaults={defaults} existing={existing} isSysAdmin={isSysAdmin} ownTenantName={ownTenantName} onSubmit={save} />}
    </div>
  );
};
