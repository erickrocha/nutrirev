import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { api } from './api';

type Reply = { status: number; data?: unknown };
const calls: Array<{ url?: string; auth?: string }> = [];

// Troca o adaptador do axios por respostas roteirizadas, passando pelos interceptadores de verdade.
const script = (replies: Record<string, Reply[]>) => {
  calls.length = 0;
  api.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
    calls.push({ url: config.url, auth: config.headers.Authorization as string | undefined });
    const reply = replies[config.url ?? '']?.shift() ?? { status: 200, data: {} };
    const response = { status: reply.status, data: reply.data, config, headers: {}, statusText: '' } as AxiosResponse;
    if (reply.status >= 400) throw Object.assign(new Error(`HTTP ${reply.status}`), { isAxiosError: true, config, response });
    return response;
  }) as AxiosAdapter;
};

beforeEach(() => { localStorage.clear(); delete api.defaults.headers.common.Authorization; });

describe('api', () => {
  it('anexa o token guardado a cada requisição', async () => {
    localStorage.setItem('token', 'abc');
    script({ '/ping': [{ status: 200 }] });
    await api.get('/ping');
    expect(calls[0].auth).toBe('Bearer abc');
  });

  it('401: renova o token uma vez e repete a requisição com o novo', async () => {
    localStorage.setItem('token', 'velho');
    localStorage.setItem('refreshToken', 'r');
    script({ '/dados': [{ status: 401 }, { status: 200, data: { ok: true } }], '/refresh': [{ status: 200, data: { accessToken: 'novo', refreshToken: 'r2' } }] });
    const response = await api.get('/dados');
    expect(response.data).toEqual({ ok: true });
    expect(calls.map((call) => call.url)).toEqual(['/dados', '/refresh', '/dados']);
    expect(calls[2].auth).toBe('Bearer novo');
    expect(localStorage.getItem('token')).toBe('novo');
    expect(localStorage.getItem('refreshToken')).toBe('r2');
  });

  it('várias requisições com 401 ao mesmo tempo renovam o token uma única vez', async () => {
    localStorage.setItem('token', 'velho');
    localStorage.setItem('refreshToken', 'r');
    script({
      '/a': [{ status: 401 }, { status: 200, data: 'a' }], '/b': [{ status: 401 }, { status: 200, data: 'b' }],
      '/refresh': [{ status: 200, data: { accessToken: 'novo' } }],
    });
    const [a, b] = await Promise.all([api.get('/a'), api.get('/b')]);
    expect([a.data, b.data]).toEqual(['a', 'b']);
    expect(calls.filter((call) => call.url === '/refresh')).toHaveLength(1);
  });

  it('401 sem refresh token limpa a sessão e devolve o erro', async () => {
    localStorage.setItem('token', 'velho');
    script({ '/dados': [{ status: 401 }] });
    await expect(api.get('/dados')).rejects.toMatchObject({ response: { status: 401 } });
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('refresh recusado limpa a sessão e devolve o erro da renovação', async () => {
    localStorage.setItem('token', 'velho');
    localStorage.setItem('refreshToken', 'r');
    script({ '/dados': [{ status: 401 }], '/refresh': [{ status: 401 }] });
    await expect(api.get('/dados')).rejects.toBeTruthy();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('401 no próprio login não tenta renovar', async () => {
    localStorage.setItem('refreshToken', 'r');
    script({ '/login': [{ status: 401 }] });
    await expect(api.post('/login')).rejects.toBeTruthy();
    expect(calls.map((call) => call.url)).toEqual(['/login']);
  });

  it('outros erros passam direto, sem mexer na sessão', async () => {
    localStorage.setItem('token', 'abc');
    script({ '/dados': [{ status: 500 }] });
    await expect(api.get('/dados')).rejects.toMatchObject({ response: { status: 500 } });
    expect(localStorage.getItem('token')).toBe('abc');
  });
});
