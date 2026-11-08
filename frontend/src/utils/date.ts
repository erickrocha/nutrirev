/** "2026-03-09" → "09/03/2026"; devolve o texto original se não for uma data ISO. */
export const formatIsoDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
};

export const todayIso = (): string => new Date().toISOString().split('T')[0];

export const formatCents = (cents: number | null | undefined): string =>
  (Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

/** "2026-03-09" → data no formato do idioma (meio-dia local, para não mudar de dia por fuso). */
export const formatLocalDate = (value: string | null | undefined, language: string | undefined): string =>
  value ? new Intl.DateTimeFormat(language?.startsWith('en') ? 'en-US' : 'pt-BR').format(new Date(`${value}T12:00:00`)) : '—';
