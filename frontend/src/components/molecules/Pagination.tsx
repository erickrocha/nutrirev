import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  label: string;
  pageSize: number;
  pageSizeOptions: number[];
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

const BUTTON = 'rounded-md border border-[var(--border-color)] bg-white p-1 hover:border-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-40';

export const Pagination = ({ page, totalPages, total, label, pageSize, pageSizeOptions, onPage, onPageSize }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[.85rem] text-[var(--text-body)]">
      <span>{total} {label} — {page} / {totalPages}</span>
      <div className="flex items-center gap-2">
        <select
          aria-label={t('common.itemsPerPage')} value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}
          className="rounded-md border border-[var(--border-color)] bg-white px-2 py-1 hover:border-[var(--accent-primary)]"
        >
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <button type="button" className={BUTTON} aria-label={t('common.previous')} disabled={page === 1} onClick={() => onPage(Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
        <button type="button" className={BUTTON} aria-label={t('common.next')} disabled={page === totalPages} onClick={() => onPage(Math.min(totalPages, page + 1))}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
};
