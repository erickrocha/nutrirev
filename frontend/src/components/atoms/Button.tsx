import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

// Cada variante reaproveita o estilo (hover/disabled) já definido no projeto.
const VARIANTS = {
  primary: 'btn-action-primary',
  outline: 'btn-action-outline',
  accent: 'btn-action-accent',
  landing: 'lp-btn lp-btn-primary lp-btn-lg',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  to?: string;
  children: ReactNode;
};

export const Button = ({ variant = 'primary', to, className = '', type = 'button', children, ...rest }: ButtonProps) => {
  const classes = `${VARIANTS[variant]} ${className}`.trim();
  if (to) {
    return <Link to={to} className={classes}>{children}</Link>;
  }
  return <button type={type} className={classes} {...rest}>{children}</button>;
};
