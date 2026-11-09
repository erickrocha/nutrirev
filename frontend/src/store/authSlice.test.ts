import { configureStore } from '@reduxjs/toolkit';
import reducer, { clearError, loginUser, logout, validateOrRefreshToken } from './authSlice';
import tenantReducer from './tenantSlice';
import { authService } from '../services/authService';
import { tenantService } from '../services/tenantService';

const makeStore = () => configureStore({ reducer: { auth: reducer, tenant: tenantReducer } });
// JWT sem assinatura, só para o payload `exp`.
const jwt = (expInSeconds: number) => `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expInSeconds }))}.y`;

beforeEach(() => { localStorage.clear(); vi.spyOn(tenantService, 'getTenantById').mockResolvedValue({ id: 3, name: 'Clínica' }); });
afterEach(() => vi.restoreAllMocks());

describe('authSlice', () => {
  it('login guarda a sessão, marca o SysAdmin e carrega a clínica do usuário', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({ access_token: 'a', refresh_token: 'r', role: 'SysAdmin', tenant_id: 3 });
    const store = makeStore();
    await store.dispatch(loginUser({ email: 'a@x.com', password: 'x' }));
    expect(store.getState().auth).toMatchObject({ token: 'a', refreshToken: 'r', isAuthenticated: true, isSysAdmin: true, loading: false });
    expect(localStorage.getItem('token')).toBe('a');
    expect(tenantService.getTenantById).toHaveBeenCalledWith(3);
  });

  it('login recusado mostra a mensagem da API; sem mensagem, o texto padrão; limpar remove o erro', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce({ response: { data: { message: 'Conta bloqueada' } } }).mockRejectedValueOnce({});
    const store = makeStore();
    await store.dispatch(loginUser({ email: 'a', password: 'b' }));
    expect(store.getState().auth.error).toBe('Conta bloqueada');
    await store.dispatch(loginUser({ email: 'a', password: 'b' }));
    expect(store.getState().auth.error).toMatch(/Email ou senha inválidos/);
    store.dispatch(clearError());
    expect(store.getState().auth.error).toBeNull();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it('token ainda válido: reaproveita a sessão guardada sem chamar a API', async () => {
    const token = jwt(3600);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ role: 'TenantOwner', tenantId: 3 }));
    const refresh = vi.spyOn(authService, 'refreshToken');
    const store = makeStore();
    await store.dispatch(validateOrRefreshToken());
    expect(store.getState().auth).toMatchObject({ token, isAuthenticated: true, isInitializing: false, user: { role: 'TenantOwner' } });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('token vencido com refresh válido: renova e guarda a nova sessão', async () => {
    localStorage.setItem('token', jwt(-60));
    localStorage.setItem('refreshToken', jwt(3600));
    const refresh = vi.spyOn(authService, 'refreshToken').mockResolvedValue({ accessToken: 'novo', role: 'User' });
    const store = makeStore();
    await store.dispatch(validateOrRefreshToken());
    expect(refresh).toHaveBeenCalled();
    expect(store.getState().auth).toMatchObject({ token: 'novo', isAuthenticated: true });
    expect(localStorage.getItem('token')).toBe('novo');
  });

  it('refresh recusado ou sem nenhum token válido encerra a sessão e limpa o armazenamento', async () => {
    localStorage.setItem('refreshToken', jwt(3600));
    vi.spyOn(authService, 'refreshToken').mockRejectedValue(new Error('x'));
    const store = makeStore();
    await store.dispatch(validateOrRefreshToken());
    expect(store.getState().auth).toMatchObject({ isAuthenticated: false, isInitializing: false, user: null });
    expect(localStorage.getItem('refreshToken')).toBeNull();
    localStorage.setItem('token', jwt(-60));
    await store.dispatch(validateOrRefreshToken());
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('logout zera o estado e o armazenamento', async () => {
    vi.spyOn(authService, 'login').mockResolvedValue({ accessToken: 'a', role: 'User' });
    const store = makeStore();
    await store.dispatch(loginUser({ email: 'a', password: 'b' }));
    store.dispatch(logout());
    expect(store.getState().auth).toMatchObject({ token: null, user: null, isAuthenticated: false, isInitializing: false });
    expect(localStorage.getItem('token')).toBeNull();
  });
});
