import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { Button } from '../../components/atoms/Button';
import { CustomerForm } from '../../components/organisms/CustomerForm';
import { buildDefaults, type CustomerFormSubmit } from '../../utils/customerForm';
import { loadCustomerForm, saveCustomerForm } from '../../store/customerFormSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';

export const CustomerFormPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const customerId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { customer, associations, catalogs, loading, saving, error } = useAppSelector((state) => state.customerForm);

  const load = () => { dispatch(loadCustomerForm(customerId)); };
  useEffect(() => { dispatch(loadCustomerForm(customerId)); }, [dispatch, customerId]);

  const save = async ({ payload, associations: selected }: CustomerFormSubmit) => {
    const result = await dispatch(saveCustomerForm({ id: customerId, payload, associations: selected }));
    if (saveCustomerForm.fulfilled.match(result)) navigate(PATHS.CUSTOMERS);
  };

  const editing = customerId !== undefined;
  const crumbs = [
    { label: t('customerForm.customerManagement'), to: PATHS.CUSTOMERS },
    { label: editing && customer ? t('customerForm.editCustomer', { name: customer.name }) : t('customerForm.registerNewCustomer') },
  ];
  // Falha ao carregar: o formulário só aparece com os catálogos e o cliente já carregados.
  const loadFailed = !loading && Boolean(error) && (editing ? !customer : catalogs.clinicalPlans.length === 0 && catalogs.prepareMeals.length === 0);
  const ready = !loading && !loadFailed && (!editing || customer !== null);
  const defaultCountry = i18n.language?.startsWith('en') ? 'US' : 'BR';

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={crumbs} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 mb-1 text-[1.6rem] font-medium text-[var(--text-heading)]">
          {editing ? t('customerForm.editPatientFile') : t('customerForm.registerNewPatient')}
        </h2>
        <p className="m-0 text-[.9rem] text-[var(--text-body)]">{editing ? t('customerForm.editSubtitle') : t('customerForm.registerSubtitle')}</p>
      </header>

      {loading && (
        <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>
      )}

      {loadFailed && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <span className="flex items-center gap-2"><AlertCircle size={18} />{error}</span>
          <Button variant="outline" onClick={load}><RefreshCw size={16} />{t('common.retry')}</Button>
        </div>
      )}

      {ready && (
        <CustomerForm
          key={customer?.id ?? 'new'}
          customer={customer}
          defaults={buildDefaults(
            customer, associations, defaultCountry,
            String(catalogs.clinicalPlans[0]?.id ?? ''), String(catalogs.prepareMeals[0]?.id ?? ''),
          )}
          saving={saving}
          error={error}
          cancelTo={PATHS.CUSTOMERS}
          onSubmit={save}
        />
      )}
    </div>
  );
};
