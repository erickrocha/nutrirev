import type { ReactNode } from 'react';

const TONES = { gold: 'bg-amber-100 text-amber-600', emerald: 'bg-emerald-100 text-emerald-600', indigo: 'bg-indigo-100 text-indigo-600' } as const;

interface Props {
  icon: ReactNode;
  value: number | string;
  label: string;
  tone: keyof typeof TONES;
}

export const KpiCard = ({ icon, value, label, tone }: Props) => (
  <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-white p-4">
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>{icon}</span>
    <div className="flex flex-col">
      <span className="text-[1.5rem] font-semibold leading-none text-[var(--text-heading)]">{value}</span>
      <span className="text-[.8rem] text-[var(--text-body)]">{label}</span>
    </div>
  </div>
);
