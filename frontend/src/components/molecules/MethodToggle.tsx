import type { ReactNode } from 'react';
import type { InputHTMLAttributes, Ref } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  icon: ReactNode;
  label: string;
  hint: string;
  ref?: Ref<HTMLInputElement>;
};

export const MethodToggle = ({ icon, label, hint, disabled, className = '', ref, ...rest }: Props) => (
  <label className={`flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-white px-4 py-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[var(--accent-primary)]'} ${className}`.trim()}>
    <span className="text-[var(--accent-primary)]">{icon}</span>
    <span className="flex flex-1 flex-col">
      <strong className="text-[var(--text-heading)]">{label}</strong>
      <small className="text-[var(--text-body)]">{hint}</small>
    </span>
    <input type="checkbox" ref={ref} disabled={disabled} className="h-5 w-5" {...rest} />
  </label>
);
