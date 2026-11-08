import type { ReactNode } from 'react';

interface Props {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

export const SectionCard = ({ title, icon, children, className = '' }: Props) => (
  <section className={`rounded-2xl border border-[var(--border-color)] bg-white p-6 shadow-sm ${className}`.trim()}>
    <h3 className="m-0 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2 text-[1.05rem] text-[var(--accent-primary)]">{icon}{title}</h3>
    {children}
  </section>
);
