import { Edit2, FileText, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';
import { PATHS, editPath } from '../../router/routeConfig';
import { birthOf, photoOf } from '../../utils/doctorForm';
import { formatBirthDate, phoneLabel } from '../../utils/customerView';
import type { Doctor } from '../../types/doctor';

interface Props {
  doctor: Doctor;
  language: string | undefined;
  onDelete: (doctor: Doctor) => void;
}

export const DoctorCard = ({ doctor, language, onDelete }: Props) => {
  const { t } = useTranslation();
  const photo = photoOf(doctor);
  const birth = birthOf(doctor);
  const na = t('common.notAvailable');
  const place = doctor.city ? `${doctor.city}, ${doctor.province || ''}` : doctor.province || na;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-slate-100 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-semibold text-[var(--accent-primary)]">
          {photo ? <img src={photo} alt={doctor.name} className="h-full w-full object-cover" /> : (doctor.name || 'D')[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-[1rem] text-[var(--text-heading)]" title={doctor.name}>{doctor.name}</h3>
          <span className="text-[.75rem] text-slate-500">ID #{doctor.id}</span>
        </div>
        {doctor.document
          ? <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-[2px] text-[.72rem] font-semibold text-emerald-700" title={doctor.document}><FileText size={12} />{doctor.document}</span>
          : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-[2px] text-[.72rem] font-semibold text-amber-700">{na}</span>}
      </header>
      <div className="flex flex-1 flex-col gap-2 p-4 text-[.85rem] text-[var(--text-body)]">
        <p className="m-0 flex items-center gap-2"><Mail size={14} className="shrink-0 text-amber-500" /><span className="truncate">{doctor.email || na}</span></p>
        <p className="m-0 flex items-center gap-2"><Phone size={14} className="shrink-0" />{phoneLabel(doctor.phone)}</p>
        <p className="m-0 flex items-center gap-2"><MapPin size={14} className="shrink-0" />{place}</p>
        {birth && <p className="m-0 text-[.78rem]">{t('doctors.dateOfBirth')}: {formatBirthDate(birth, language)}</p>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-100 p-3">
        <Button variant="outline" to={editPath(PATHS.DOCTORS, doctor.id)} title={t('common.edit')}><Edit2 size={15} />{t('common.edit')}</Button>
        <Button variant="outline" onClick={() => onDelete(doctor)} title={t('common.delete')}><Trash2 size={15} />{t('common.delete')}</Button>
      </footer>
    </article>
  );
};
