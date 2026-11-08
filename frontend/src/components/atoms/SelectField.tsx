import type { Ref, SelectHTMLAttributes } from 'react';

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
};

const SELECT =
  'box-border w-full rounded-[9px] border border-[var(--border-color)] bg-white px-3 py-[11px] text-[var(--text-heading)] ' +
  'hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-2 focus:outline-[rgba(29,111,209,.18)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const SelectField = ({ id, label, error, className = '', children, ref, ...rest }: SelectFieldProps) => (
  <div className={`flex flex-col gap-[7px] ${className}`.trim()}>
    <label htmlFor={id} className="text-[.8rem] font-semibold text-[var(--text-heading)]">{label}</label>
    <select id={id} ref={ref} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={SELECT} {...rest}>
      {children}
    </select>
    {error && <small id={`${id}-error`} role="alert" className="text-[.72rem] text-red-700">{error}</small>}
  </div>
);
