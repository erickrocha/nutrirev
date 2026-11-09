import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Base compartilhada: hover só quando habilitado (vale para <button> e <a>) e estilo de desabilitado.
const BASE = "inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-full border px-6 py-[11px] font-['Jost',sans-serif] text-[.85rem] font-medium uppercase leading-none tracking-[.08em] no-underline transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-secondary)]";

const VARIANTS = {
  primary: `${BASE} border-transparent bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-hover)] text-white shadow-[0_4px_14px_rgba(29,111,209,.25)] [&:not(:disabled)]:hover:-translate-y-px [&:not(:disabled)]:hover:shadow-[0_6px_20px_rgba(29,111,209,.35)]`,
  outline: `${BASE} border-[var(--border-color)] bg-[var(--bg-alt)] text-[var(--text-heading)] [&:not(:disabled)]:hover:border-[var(--accent-primary)] [&:not(:disabled)]:hover:text-[var(--accent-primary)]`,
  accent: `${BASE} border-transparent bg-[var(--accent-secondary)] text-[var(--text-heading)] [&:not(:disabled)]:hover:-translate-y-px [&:not(:disabled)]:hover:bg-[var(--accent-secondary-hover)]`,
  landing: `${BASE} border-transparent bg-[var(--accent-primary)] px-[30px] py-[14px] text-base normal-case tracking-normal text-white [&:not(:disabled)]:hover:bg-[var(--accent-hover)]`,
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  to?: string;
  children: ReactNode;
};

export const Button = ({ variant = 'primary', to, className = '', type = 'button', children, title, 'aria-label': ariaLabel, ...rest }: ButtonProps) => {
  const classes = `${VARIANTS[variant]} ${className}`.trim();
  if (to) {
    return <Link to={to} className={classes} title={title} aria-label={ariaLabel}>{children}</Link>;
  }
  return <button type={type} className={classes} title={title} aria-label={ariaLabel} {...rest}>{children}</button>;
};
