import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../brand/Logo';
import { LanguageToggle } from '../common/LanguageSwitcher';
import { Container } from './Container';

/** Cabeçalho das telas públicas: marca, idioma e, opcionalmente, navegação e ação. */
export const PublicHeader = ({ nav, action, tagline }: { nav?: ReactNode; action?: ReactNode; tagline?: string }) => {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-white/90 backdrop-blur-[10px]">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Link to="/" aria-label={t('site.nav.home')} className="inline-flex flex-col gap-[2px] text-[var(--text-heading)] no-underline">
          <Logo />
          {tagline && <span className="text-[.72rem] leading-none tracking-[.02em] text-[var(--text-body)]">{tagline}</span>}
        </Link>
        {nav}
        <LanguageToggle className="ml-auto text-sm" />
        {action}
      </Container>
    </header>
  );
};
