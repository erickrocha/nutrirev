import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { UserListPage } from './UserListPage';
import { UserFormPage } from './UserFormPage';
import { tenantService } from '../../services/tenantService';
import { userService } from '../../services/userService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const admin = { role: 'SysAdmin' };
const owner = { role: 'TenantOwner', tenantId: 3 };
const users = [
  { id: 1, name: 'Ana', email: 'ana@x.com', role: 'TenantOwner', tenantId: 3, enabled: true },
  { id: 2, name: 'Beto', email: 'beto@x.com', role: 'User', tenant_id: 4, enabled: false },
];

const mock = (list: unknown[] = users) => {
  vi.spyOn(userService, 'getUsers').mockResolvedValue(list);
  vi.spyOn(tenantService, 'getTenants').mockResolvedValue([{ id: 3, name: 'Clínica Sol' }, { id: 4, name: 'Clínica Lua' }]);
};

describe('UserListPage', () => {
  it('SysAdmin vê todos os usuários, com clínica e status', async () => {
    mock();
    renderWithApp(<UserListPage />, { user: admin });
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(await screen.findByText('Clínica Lua')).toBeInTheDocument();
    expect(screen.getByText('common.inactive')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /common.edit/ })[0]).toHaveAttribute('href', '/users/1/edit');
  });

  it('o dono da clínica só vê os usuários da própria clínica', async () => {
    mock();
    renderWithApp(<UserListPage />, { user: owner });
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Beto')).not.toBeInTheDocument();
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    mock([]);
    const { unmount } = renderWithApp(<UserListPage />, { user: admin });
    expect(await screen.findByText('users.noUsersFound')).toBeInTheDocument();
    unmount();
    mock();
    vi.spyOn(userService, 'getUsers').mockRejectedValueOnce({});
    renderWithApp(<UserListPage />, { user: admin });
    expect(await screen.findByText(/Falha ao buscar usuários|users.errorLoading/)).toBeInTheDocument();
  });
});

describe('UserFormPage', () => {
  it('exige senha no cadastro', async () => {
    mock();
    const create = vi.spyOn(userService, 'createUser');
    renderWithApp(<UserFormPage />, { route: '/users/new', path: '/users/new', user: admin });
    await userEvent.type(await screen.findByLabelText('users.fullName'), 'Carla');
    await userEvent.type(screen.getByLabelText('users.corporateEmail'), 'carla@x.com');
    await userEvent.click(screen.getByRole('button', { name: /users.registerUser/ }));
    expect(await screen.findByText('users.passwordRequired')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('SysAdmin cadastra escolhendo a clínica; a primeira já vem selecionada', async () => {
    mock();
    const create = vi.spyOn(userService, 'createUser').mockResolvedValue({ id: 9 });
    renderWithApp(<UserFormPage />, { route: '/users/new', path: '/users/new', user: admin });
    await userEvent.type(await screen.findByLabelText('users.fullName'), 'Carla');
    await userEvent.type(screen.getByLabelText('users.corporateEmail'), 'carla@x.com');
    await userEvent.type(screen.getByLabelText('users.accessPassword'), 'Segredo123!');
    await userEvent.selectOptions(screen.getByLabelText('users.accessLevel'), 'TenantUser');
    await userEvent.click(screen.getByRole('button', { name: /users.registerUser/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ name: 'Carla', email: 'carla@x.com', role: 'TenantUser', enabled: true, tenantId: 3, password: 'Segredo123!' }));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('o dono da clínica não escolhe a clínica nem cria SysAdmin', async () => {
    mock();
    renderWithApp(<UserFormPage />, { route: '/users/new', path: '/users/new', user: owner });
    expect(await screen.findByLabelText('users.associatedTenant')).toBeDisabled();
    expect(screen.getByLabelText('users.associatedTenant')).toHaveValue('Clínica Sol');
    expect(screen.queryByRole('option', { name: 'enums.role.SysAdmin' })).not.toBeInTheDocument();
  });

  it('na edição a senha é opcional e o firstLogin do usuário é preservado', async () => {
    mock();
    const update = vi.spyOn(userService, 'updateUser').mockResolvedValue({});
    renderWithApp(<UserFormPage />, { route: '/users/1/edit', path: '/users/:id/edit', user: admin });
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, { name: 'Ana', email: 'ana@x.com', role: 'TenantOwner', enabled: true, tenantId: 3, firstLogin: true }));
  });

  it('mostra a mensagem da API ao falhar e erro para usuário inexistente', async () => {
    mock();
    vi.spyOn(userService, 'updateUser').mockRejectedValue({ response: { data: { message: 'e-mail em uso' } } });
    const { unmount } = renderWithApp(<UserFormPage />, { route: '/users/1/edit', path: '/users/:id/edit', user: admin });
    await userEvent.click(await screen.findByRole('button', { name: /common.saveChanges/ }));
    expect(await screen.findByText('e-mail em uso')).toBeInTheDocument();
    unmount();
    renderWithApp(<UserFormPage />, { route: '/users/99/edit', path: '/users/:id/edit', user: admin });
    expect(await screen.findByText('users.noUsersFound')).toBeInTheDocument();
  });
});
