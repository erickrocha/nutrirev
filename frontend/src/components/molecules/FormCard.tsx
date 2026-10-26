import type { ReactNode } from 'react';

interface FormCardProps {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

// Todo formulário: header, body e footer (botões sempre no footer).
export const FormCard = ({ header, children, footer }: FormCardProps) => (
  <section className="mb-4 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-alt)] shadow-sm">
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-6 py-[18px]">{header}</header>
    <div className="p-6">{children}</div>
    <footer className="flex flex-wrap items-center justify-between gap-[10px] border-t border-[var(--border-color)] bg-slate-400/5 px-6 py-4">{footer}</footer>
  </section>
);
