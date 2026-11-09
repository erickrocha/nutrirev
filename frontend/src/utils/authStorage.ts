// O navegador pode negar o armazenamento (janela privada, dados bloqueados): a sessão então dura só enquanto a aba vive.
const safe = <T,>(action: () => T, fallback: T): T => {
  try { return action(); } catch { return fallback; }
};

export interface StoredSession {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  tenantId?: number | null;
  tenant_id?: number | null;
  [key: string]: unknown;
}

export const tokenOf = (session: StoredSession | null | undefined): string | undefined => session?.accessToken || session?.access_token;
export const refreshTokenOf = (session: StoredSession | null | undefined): string | undefined => session?.refreshToken || session?.refresh_token;
export const tenantIdOfSession = (session: StoredSession | null | undefined): number | null => session?.tenantId || session?.tenant_id || null;

export const authStorage = {
  token: (): string | null => safe(() => localStorage.getItem('token'), null),
  refreshToken: (): string | null => safe(() => localStorage.getItem('refreshToken'), null),
  user: <T = StoredSession>(): T | null => safe(() => {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as T) : null;
  }, null),
  /** Guarda a resposta de login/refresh: os tokens, quando vierem, e o usuário completo. */
  saveSession: (session: StoredSession, fallbackRefreshToken?: string | null): void => {
    safe(() => {
      const token = tokenOf(session);
      const refresh = refreshTokenOf(session) || fallbackRefreshToken;
      if (token) localStorage.setItem('token', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(session));
    }, undefined);
  },
  clear: (): void => {
    safe(() => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); }, undefined);
  },
};
