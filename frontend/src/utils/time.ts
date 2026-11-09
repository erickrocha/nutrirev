/** Exibe "HH:mm[:ss]" no formato do idioma (12h em inglês). */
export const formatDisplayTime = (time: string | null | undefined, language: string): string => {
  if (!time) return '-';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const date = new Date();
  date.setHours(Number.parseInt(parts[0], 10), Number.parseInt(parts[1], 10), Number.parseInt(parts[2] || '0', 10), 0);
  return new Intl.DateTimeFormat(language || 'pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: parts[2] !== undefined ? '2-digit' : undefined,
    hour12: language.toLowerCase().startsWith('en'),
  }).format(date);
};

/** O input type="time" trabalha com "HH:mm"; a API, com "HH:mm:ss". */
export const toInputTime = (time: string | null | undefined): string => (time && time.length === 8 ? time.slice(0, 5) : time ?? '');
export const toApiTime = (time: string): string => (time.trim().length === 5 ? `${time.trim()}:00` : time.trim());
