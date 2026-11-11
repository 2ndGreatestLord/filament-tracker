import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface-2 text-ink',
  danger: 'border border-danger bg-transparent text-danger',
};

export function buttonClass(variant: ButtonVariant = 'primary', extra = ''): string {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-opacity active:opacity-80 disabled:opacity-40 ${VARIANTS[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
