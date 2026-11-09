import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../atoms/Button';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorAlert = ({ message, onRetry }: Props) => {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-700">
      <span className="flex items-center gap-2"><AlertCircle size={18} />{message}</span>
      {onRetry && <Button variant="outline" onClick={onRetry}><RefreshCw size={16} />{t('common.retry')}</Button>}
    </div>
  );
};
