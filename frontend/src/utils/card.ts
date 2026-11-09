// Detecta a bandeira pelo prefixo do número (só dígitos).
export const detectBrand = (number: string): string => {
  const clean = number.replace(/\D/g, '');
  if (/^(4011|438935|451416|4576|504175|5067|509|627780|636297|636368)/.test(clean)) return 'ELO';
  if (/^4/.test(clean)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
  if (/^3[47]/.test(clean)) return 'AMEX';
  if (/^(606282|3841)/.test(clean)) return 'HIPERCARD';
  return 'CARD';
};

export const formatCardNumber = (value: string): string => (value.replace(/\D/g, '').slice(0, 19).match(/.{1,4}/g) ?? []).join(' ');

export const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

/** "MM/AA" ou "MM/AAAA" → mês e ano de quatro dígitos; null quando não dá para ler. */
export const parseExpiry = (expiry: string): { month: number; year: number } | null => {
  const [monthRaw, yearRaw = ''] = expiry.split('/');
  const month = Number.parseInt(monthRaw, 10);
  const year = yearRaw.length === 2 ? Number.parseInt(`20${yearRaw}`, 10) : Number.parseInt(yearRaw, 10);
  return Number.isNaN(month) || Number.isNaN(year) ? null : { month, year };
};

export const isExpiryValid = (expiry: string, now: Date = new Date()): boolean => {
  const parsed = parseExpiry(expiry);
  if (!parsed) return false;
  const { month, year } = parsed;
  const currentYear = now.getFullYear();
  if (month < 1 || month > 12 || year < currentYear || year > 2099) return false;
  return !(year === currentYear && month < now.getMonth() + 1);
};

export const isCardNumberValid = (number: string): boolean => {
  const length = number.replace(/\D/g, '').length;
  return length >= 13 && length <= 19;
};

export const isCvvValid = (cvv: string): boolean => {
  const length = cvv.replace(/\D/g, '').length;
  return length >= 3 && length <= 4;
};

export const formatBRL = (cents: unknown): string =>
  typeof cents === 'number' ? `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00';

/** Dias até o vencimento (negativo se atrasado); null sem data válida. */
export const daysUntil = (isoDate: string | undefined, now: Date = new Date()): number | null => {
  if (!isoDate) return null;
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
};
