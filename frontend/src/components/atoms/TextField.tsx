import type { InputHTMLAttributes, Ref } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
};

const INPUT =
  'box-border w-full rounded-[9px] border border-[var(--border-color)] bg-white px-3 py-[11px] text-[var(--text-heading)] ' +
  'hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-2 focus:outline-[rgba(29,111,209,.18)] ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

export const TextField = ({ id, label, error, className = '', ref, ...rest }: TextFieldProps) => (
  <div className={`flex flex-col gap-[7px] ${className}`.trim()}>
    <label htmlFor={id} className="text-[.8rem] font-semibold text-[var(--text-heading)]">{label}</label>
    <input id={id} ref={ref} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={INPUT} {...rest} />
    {error && <small id={`${id}-error`} role="alert" className="text-[.72rem] text-red-700">{error}</small>}
  </div>
);
