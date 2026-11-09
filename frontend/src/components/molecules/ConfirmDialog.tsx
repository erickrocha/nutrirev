import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  tone?: 'danger' | 'primary';
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({ title, message, confirmLabel, busy, tone = 'danger', children, onConfirm, onCancel }: Props) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 id="confirm-title" className="m-0 mb-2 text-[1.1rem] text-[var(--text-heading)]">{title}</h3>
        <p id="confirm-message" className="m-0 mb-5 text-[var(--text-body)]">{message}</p>
        {children}
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onCancel} disabled={busy}>{t('common.cancel')}</Button>
          <Button onClick={onConfirm} disabled={busy} className={tone === 'danger' ? '!bg-red-600 hover:!bg-red-700' : ''}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};
