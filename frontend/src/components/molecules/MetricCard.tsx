import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';

const TONES = {
  gold: 'bg-amber-100 text-amber-600', blue: 'bg-blue-100 text-blue-600', green: 'bg-emerald-100 text-emerald-600',
  red: 'bg-red-100 text-red-600', purple: 'bg-purple-100 text-purple-600',
} as const;

interface Props {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: keyof typeof TONES;
  /** Com destino, o cartão inteiro vira um link. */
  to?: string;
}

const BASE = 'flex items-start justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-white p-5 shadow-sm text-inherit no-underline';

export const MetricCard = ({ icon: Icon, label, value, detail, tone = 'gold', to }: Props) => {
  const body = (
    <>
      <div>
        <p className="m-0 mb-2 text-[.78rem] font-semibold uppercase tracking-wide text-[var(--text-body)]">{label}</p>
        <strong className="block text-[1.8rem] leading-none text-[var(--text-heading)]">{value}</strong>
        {detail && <span className="mt-2 block text-[.78rem] text-[var(--text-body)]">{detail}</span>}
      </div>
      <span className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={21} /></span>
    </>
  );
  return to ? <Link to={to} className={`${BASE} hover:border-[var(--accent-primary)]`}>{body}</Link> : <article className={BASE}>{body}</article>;
};
