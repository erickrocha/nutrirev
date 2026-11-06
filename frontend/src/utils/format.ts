export type Lang = 'pt' | 'en';

export const formatPrice = (cents: number, lang: Lang): string =>
  new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export const onlyDigits = (value: unknown, max?: number): string => {
  const d = String(value ?? '').replace(/\D/g, '');
  return max ? d.slice(0, max) : d;
};

export const maskTaxId = (value: unknown): string => {
  const d = onlyDigits(value, 14);
  if (d.length <= 11) {
    return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};

export const maskPhone = (value: unknown): string => {
  const d = onlyDigits(value, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return d.replace(/^(\d{2})(\d+)/, '($1) $2');
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return d.replace(/^(\d{2})(\d{5})(\d+)/, '($1) $2-$3');
};

export const maskPostalCode = (value: unknown): string => onlyDigits(value, 8).replace(/^(\d{5})(\d)/, '$1-$2');
