import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/brand/Logo';

interface Props { homePath?: string; homeLabelKey?: 'notFound.home' | 'notFound.login' }

export const NotFoundPage = ({ homePath = '/', homeLabelKey = 'notFound.home' }: Props) => {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-primary)] px-6 text-center text-[var(--text-body)]">
      <Logo size={36} />
      <p className="m-0 font-['Jost',sans-serif] text-[5rem] font-light leading-none text-[var(--accent-primary)]">{t('notFound.code')}</p>
      <h1 className="m-0 text-2xl font-medium text-[var(--text-heading)]">{t('notFound.title')}</h1>
      <p className="m-0 max-w-[44ch]">{t('notFound.text')}</p>
      <Link to={homePath} className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-6 py-[11px] text-[.92rem] font-medium text-white no-underline transition-colors hover:bg-[var(--accent-hover)]">{t(homeLabelKey)}</Link>
    </main>
  );
};
