import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, FileText, LayoutGrid, List, MapPin, Plus, RefreshCw, Stethoscope, Trash2 } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { KpiCard } from '../../components/molecules/KpiCard';
import { SearchBox } from '../../components/molecules/SearchBox';
import { ViewToggle } from '../../components/molecules/ViewToggle';
import { Button } from '../../components/atoms/Button';
import { DoctorCard } from '../../components/organisms/DoctorCard';
import { deleteDoctor, fetchDoctors } from '../../store/doctorSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS, editPath, newPath } from '../../router/routeConfig';
import { formatBirthDate, phoneLabel } from '../../utils/customerView';
import { birthOf, matchesDoctorSearch } from '../../utils/doctorForm';
import type { Doctor } from '../../types/doctor';

type DisplayView = 'cards' | 'table';

export const DoctorListPage = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { doctors, loading, saving, error } = useAppSelector((state) => state.doctor);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<DisplayView>('cards');
  const [deleting, setDeleting] = useState<Doctor | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const load = () => { dispatch(fetchDoctors()); };
  useEffect(() => { dispatch(fetchDoctors()); }, [dispatch]);

  const visible = useMemo(() => doctors.filter((doctor) => matchesDoctorSearch(doctor, search)), [doctors, search]);
  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await dispatch(deleteDoctor(deleting.id));
    setDeleteFailed(!deleteDoctor.fulfilled.match(result));
    if (deleteDoctor.fulfilled.match(result)) setDeleting(null);
  };
  const message = error === null ? null : error || t(deleteFailed ? 'doctors.errorDeleting' : 'doctors.errorLoading');
  const na = t('common.notAvailable');

  return (
    <div className="w-full">
      <Breadcrumb items={[{ label: t('doctors.title') }]} />
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[1.5rem] font-medium text-[var(--text-heading)]">{t('doctors.title')}</h2>
          <p className="m-0 text-[.9rem] text-[var(--text-body)]">{t('doctors.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading} title={t('common.refreshList')}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{t('common.refresh')}</Button>
          <Button to={newPath(PATHS.DOCTORS)}><Plus size={18} />{t('doctors.addDoctor')}</Button>
        </div>
      </header>

      {message !== null && <ErrorAlert message={message} onRetry={load} />}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard tone="gold" icon={<Stethoscope size={24} />} value={visible.length} label={t('doctors.totalDoctors')} />
        <KpiCard tone="emerald" icon={<FileText size={24} />} value={visible.filter((d) => d.document?.trim()).length} label={t('doctors.withCRM')} />
        <KpiCard tone="indigo" icon={<MapPin size={24} />} value={visible.filter((d) => d.city || d.province).length} label={t('doctors.withLocation')} />
      </div>

      <div className="mb-2 flex flex-wrap items-start gap-4">
        <div className="min-w-[260px] flex-1"><SearchBox value={search} onChange={setSearch} placeholder={t('doctors.searchPlaceholder')} /></div>
        <ViewToggle
          value={view} onChange={setView}
          options={[
            { id: 'cards', label: t('common.cards'), title: t('common.cardsView'), icon: LayoutGrid },
            { id: 'table', label: t('common.table'), title: t('common.tableView'), icon: List },
          ]}
        />
      </div>

      {loading && doctors.length === 0 ? (
        <p role="status" className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-[var(--text-body)]"><RefreshCw size={22} className="animate-spin" />{t('doctors.loadingDoctors')}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-white p-10 text-center text-[var(--text-body)]">
          <Stethoscope size={36} />
          <p className="m-0">{t('doctors.noDoctorsFound')}</p>
          <Button to={newPath(PATHS.DOCTORS)}><Plus size={16} />{t('doctors.addDoctor')}</Button>
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((doctor) => <DoctorCard key={doctor.id} doctor={doctor} language={i18n.resolvedLanguage} onDelete={(target) => { setDeleteFailed(false); setDeleting(target); }} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-slate-50 text-[.8rem] text-[var(--text-body)]">
                {['doctors.doctor', 'doctors.documentCRM', 'doctors.contact', 'doctors.location', 'doctors.dateOfBirth'].map((key) => <th key={key} className="px-4 py-3">{t(key)}</th>)}
                <th className="px-4 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((doctor) => (
                <tr key={doctor.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <td className="px-4 py-3"><div className="flex flex-col"><span className="font-semibold">{doctor.name}</span><span className="text-[.78rem] text-slate-500">ID #{doctor.id}</span></div></td>
                  <td className="px-4 py-3">{doctor.document || '—'}</td>
                  <td className="px-4 py-3 text-[.85rem]"><span className="block">{doctor.email || '—'}</span><span className="text-slate-500">{phoneLabel(doctor.phone)}</span></td>
                  <td className="px-4 py-3 text-[.85rem]">{doctor.city ? `${doctor.city}, ${doctor.province || ''}` : doctor.province || na}</td>
                  <td className="px-4 py-3 text-[.85rem]">{birthOf(doctor) ? formatBirthDate(birthOf(doctor), i18n.resolvedLanguage) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" to={editPath(PATHS.DOCTORS, doctor.id)} title={t('common.edit')} aria-label={t('common.edit')}><Edit2 size={16} /></Button>
                      <Button variant="outline" onClick={() => { setDeleteFailed(false); setDeleting(doctor); }} title={t('common.delete')} aria-label={t('common.delete')}><Trash2 size={16} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          title={t('doctors.confirmDeleteTitle')} message={`${t('doctors.confirmDeleteMsg')} "${deleting.name}"? ${t('doctors.cannotBeUndone')}`} confirmLabel={t('common.delete')}
          busy={saving} onConfirm={confirmDelete} onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
};
