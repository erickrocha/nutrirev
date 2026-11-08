import { newUserDefaults, toUserPayload, userToForm } from './userForm';

describe('userForm', () => {
  it('SysAdmin começa pela primeira clínica; os demais, pela própria', () => {
    expect(newUserDefaults(true, 8, 3)).toMatchObject({ tenantId: '8', role: 'User', enabled: true });
    expect(newUserDefaults(false, 8, 3).tenantId).toBe('3');
    expect(newUserDefaults(true, undefined, null).tenantId).toBe('');
  });

  it('carrega o usuário aceitando tenant_id e deixa a senha em branco', () => {
    expect(userToForm({ id: 1, email: 'a@x.com', name: 'Ana', role: 'TenantOwner', tenant_id: 5 }, true, null)).toEqual({
      name: 'Ana', email: 'a@x.com', password: '', role: 'TenantOwner', tenantId: '5', enabled: true,
    });
    expect(userToForm({ id: 2, email: 'b@x.com' }, false, 9).tenantId).toBe('9');
  });

  it('senha só segue quando preenchida e firstLogin só ao editar', () => {
    const values = { name: 'Ana', email: 'a@x.com', password: '', role: 'User', tenantId: '', enabled: false };
    expect(toUserPayload(values)).toEqual({ name: 'Ana', email: 'a@x.com', role: 'User', enabled: false, tenantId: null });
    const edited = toUserPayload({ ...values, password: 'Nova123!', tenantId: '4' }, { id: 1, email: 'a@x.com', first_login: false });
    expect(edited).toEqual({ name: 'Ana', email: 'a@x.com', role: 'User', enabled: false, tenantId: 4, firstLogin: false, password: 'Nova123!' });
  });
});
