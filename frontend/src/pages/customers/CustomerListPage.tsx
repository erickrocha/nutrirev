import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, FileText, LayoutGrid, List, Plus, RefreshCw, Smartphone, UserCheck, Users, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { KpiCard } from '../../components/molecules/KpiCard';
import { SearchBox } from '../../components/molecules/SearchBox';
import { ViewToggle } from '../../components/molecules/ViewToggle';
import { Button } from '../../components/atoms/Button';
import { CustomerCard } from '../../components/organisms/CustomerCard';
import { CustomerTable } from '../../components/organisms/CustomerTable';
import { dismissCustomerListError, dismissEnabledNotice, enableCustomerMobile, loadCustomerList } from '../../store/customerListSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, newPath } from '../../router/routeConfig';
import { isMobileEnabled, matchesCustomerSearch, mealIdOf, planIdOf } from '../../utils/customerView';
import type { Customer } from '../../types/customer';

type DisplayView = 'cards' | 'table';

export const CustomerListPage = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { customers, plans, meals, loading, enabling, error, enabledName } = useAppSelector((state) => state.customerList);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<DisplayView>('cards');
  const [confirming, setConfirming] = useState<Customer | null>(null);

  const load = () => { dispatch(loadCustomerList()); };
  useEffect(() => { dispatch(loadCustomerList()); }, [dispatch]);

  const visible = useMemo(() => customers.filter((customer) => matchesCustomerSearch(customer, search)), [customers, search]);
  const planName = (customer: Customer) => plans.find((plan) => plan.id === planIdOf(customer))?.name ?? t('common.noPlan');
  const mealName = (customer: Customer) => meals.find((meal) => meal.id === mealIdOf(customer))?.name ?? t('common.notAvailable');

  const confirmEnable = async () => {
    if (!confirming) return;
    await dispatch(enableCustomerMobile(confirming));
    setConfirming(null);
  };

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('customers.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('customers.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('customers.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={newPath(PATHS.CUSTOMERS)}><Plus size={18} />{t('customers.addCustomer')}</Button>
        </div>
      </header>

      {error !== null && (
        <div className="relative">
          <ErrorAlert message={error || t('customers.errorLoadingList')} onRetry={load} />
          <button type="button" onClick={() => dispatch(dismissCustomerListError())} aria-label={t('common.close')} className="absolute right-2 top-2 rounded p-1 text-red-700 hover:bg-red-100"><X size={14} /></button>
        </div>
      )}
      {enabledName && (
        <div role="status" className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[.88rem] text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle size={18} />{`${t('customers.mobileEnabledSuccess')} "${enabledName}"!`}</span>
          <button type="button" onClick={() => dispatch(dismissEnabledNotice())} aria-label={t('common.close')} className="rounded p-1 hover:bg-emerald-100"><X size={16} /></button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard tone="gold" icon={<Users size={24} />} value={visible.length} label={t('customers.totalCustomers')} />
        <KpiCard tone="emerald" icon={<Smartphone size={24} />} value={visible.filter(isMobileEnabled).length} label={t('customers.mobileAccessActive')} />
        <KpiCard tone="indigo" icon={<FileText size={24} />} value={visible.filter((c) => planIdOf(c) !== null).length} label={t('customers.clinicalPlansAssigned')} />
      </div>

      <div className="mb-2 flex flex-wrap items-start gap-4">
        <div className="min-w-[260px] flex-1"><SearchBox value={search} onChange={setSearch} placeholder={t('customers.searchPlaceholder')} /></div>
        <ViewToggle
          value={view} onChange={setView}
          options={[
            { id: 'cards', label: t('common.cards'), title: t('common.cardsView'), icon: LayoutGrid },
            { id: 'table', label: t('common.table'), title: t('common.tableView'), icon: List },
          ]}
        />
      </div>

      {loading && customers.length === 0 ? (
        <p role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('customers.loadingCustomers')}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]">
          <UserCheck size={36} />
          <p className="m-0">{t('customers.noCustomerRegistered')}</p>
          <Button to={newPath(PATHS.CUSTOMERS)}><Plus size={16} />{t('customers.registerFirstCustomer')}</Button>
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} planName={planName(customer)} mealName={mealName(customer)} language={i18n.resolvedLanguage} onEnableMobile={setConfirming} />
          ))}
        </div>
      ) : (
        <CustomerTable customers={visible} planName={planName} mealName={mealName} language={i18n.resolvedLanguage} onEnableMobile={setConfirming} />
      )}

      {confirming && (
        <ConfirmDialog
          tone="primary" busy={enabling} confirmLabel={enabling ? t('customers.enabling') : t('customers.confirmEnable')}
          title={t('customers.enableMobileAccessTitle')} message={`${t('customers.enableMobileConfirm')} ${confirming.name}?`}
          onConfirm={confirmEnable} onCancel={() => setConfirming(null)}
        >
          <ul className="mb-5 list-none rounded-lg border border-[var(--border-color)] bg-slate-50 p-3 text-[.82rem] text-slate-600">
            <li><strong>{t('customers.accessEmail')}</strong> {confirming.email}</li>
            <li><strong>{t('customers.defaultPassword')}</strong> <code>Mudar123!</code></li>
            <li><strong>{t('customers.assignedPermission')}</strong> {t('customers.userFirstAccess')}</li>
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
};
