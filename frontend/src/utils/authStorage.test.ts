import { authStorage, refreshTokenOf, tenantIdOfSession, tokenOf } from './authStorage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('authStorage', () => {
  it('guarda a sessão com os tokens nos dois formatos de campo e lê de volta', () => {
    authStorage.saveSession({ access_token: 'a', refresh_token: 'r', role: 'User' });
    expect([authStorage.token(), authStorage.refreshToken(), authStorage.user()]).toEqual(['a', 'r', { access_token: 'a', refresh_token: 'r', role: 'User' }]);
  });

  it('mantém o refresh token anterior quando a resposta não traz outro, sem tocar no token ausente', () => {
    localStorage.setItem('token', 'velho');
    authStorage.saveSession({ role: 'User' }, 'anterior');
    expect([authStorage.token(), authStorage.refreshToken()]).toEqual(['velho', 'anterior']);
  });

  it('limpa tudo', () => {
    authStorage.saveSession({ accessToken: 'a', refreshToken: 'r' });
    authStorage.clear();
    expect([authStorage.token(), authStorage.refreshToken(), authStorage.user()]).toEqual([null, null, null]);
  });

  it('usuário salvo corrompido vira null', () => {
    localStorage.setItem('user', '{ruim');
    expect(authStorage.user()).toBeNull();
  });

  it('nunca lança se o navegador negar o armazenamento', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('x'); });
    expect(authStorage.token()).toBeNull();
    expect(() => authStorage.saveSession({ accessToken: 'a' })).not.toThrow();
    expect(() => authStorage.clear()).not.toThrow();
  });

  it('lê tokens e clínica nos dois formatos', () => {
    expect([tokenOf({ accessToken: 'a' }), tokenOf({ access_token: 'b' }), tokenOf(null)]).toEqual(['a', 'b', undefined]);
    expect(refreshTokenOf({ refresh_token: 'r' })).toBe('r');
    expect([tenantIdOfSession({ tenant_id: 4 }), tenantIdOfSession({ tenantId: 5 }), tenantIdOfSession({})]).toEqual([4, 5, null]);
  });
});
