import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from './MainLayout';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import authReducer from '../../store/authSlice';
import tenantReducer from '../../store/tenantSlice';

// Referência estável, como no react-i18next real (efeitos dependem de `t`).
const i18n = { t: (key: string) => key, i18n: { language: 'pt', changeLanguage: vi.fn() } };
vi.mock('react-i18next', () => ({ useTranslation: () => i18n }));

const setup = (role: string, route: string, children: React.ReactNode = <MainLayout />, tenantName?: string) => {
  const store = configureStore({
    reducer: combineReducers({ auth: authReducer, tenant: tenantReducer }),
    preloadedState: {
      auth: { token: 't', refreshToken: null, user: { name: 'Ana', email: 'ana@x.com', role }, isAuthenticated: true, isInitializing: false, isSysAdmin: role === 'SysAdmin', loading: false, error: null },
      ...(tenantName ? { tenant: { activeTenant: { id: 1, name: tenantName }, tenantsList: [], loading: false, error: null } } : {}),
    } as never,
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={children}>
            <Route path="/dashboard" element={<p>painel</p>} />
            <Route path="/home" element={<p>início</p>} />
            <Route path="/users" element={<p>usuários</p>} />
            <Route path="/admin/dashboard" element={<p>painel admin</p>} />
          </Route>
          <Route path="*" element={<p>fora</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('MainLayout', () => {
  it('mostra a tela quando o perfil pode abri-la', () => {
    setup('TenantOwner', '/dashboard');
    expect(screen.getByText('painel')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'sidebar.navigation' })).toBeInTheDocument();
  });

  it('redireciona para a tela inicial do perfil quando a rota não é permitida', () => {
    setup('User', '/users');
    expect(screen.getByText('início')).toBeInTheDocument();
    expect(screen.queryByText('usuários')).not.toBeInTheDocument();
  });

  it('o SysAdmin cai no painel da plataforma', () => {
    setup('SysAdmin', '/home');
    expect(screen.getByText('painel admin')).toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  it('lista os itens do perfil e marca o atual', () => {
    setup('TenantOwner', '/dashboard');
    expect(screen.getByRole('link', { name: 'sidebar.dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'sidebar.users' })).toHaveAttribute('href', '/users');
    expect(screen.queryByRole('link', { name: 'sidebar.tenants' })).not.toBeInTheDocument();
  });

  it('recolhe a barra escondendo os rótulos e recolhe/expande uma seção, lembrando a escolha', async () => {
    const { unmount } = setup('TenantOwner', '/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'sidebar.serviceAndGoals' }));
    expect(screen.queryByRole('link', { name: 'sidebar.customerGoals' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('nutrirev.sidebarSections.TenantOwner') as string)).toEqual({ 'service-and-goals': false });
    unmount();
    setup('TenantOwner', '/dashboard');
    expect(screen.queryByRole('link', { name: 'sidebar.customerGoals' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'sidebar.collapseMenu' }));
    expect(screen.queryByText('sidebar.main')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'sidebar.customerGoals' })).toBeInTheDocument();
  });

  it('abrir uma tela de uma seção recolhida reabre a seção', () => {
    localStorage.setItem('nutrirev.sidebarSections.TenantOwner', JSON.stringify({ main: false }));
    setup('TenantOwner', '/users');
    expect(screen.getByRole('link', { name: 'sidebar.users' })).toBeInTheDocument();
  });

  it('funciona mesmo se o armazenamento do navegador falhar', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    setup('TenantOwner', '/dashboard');
    await userEvent.click(screen.getByRole('button', { name: 'sidebar.main' }));
    expect(screen.queryByRole('link', { name: 'sidebar.users' })).not.toBeInTheDocument();
  });

  it('no celular, o menu aberto mostra o fundo e fecha ao tocar nele', async () => {
    const onClose = vi.fn();
    setup('TenantOwner', '/dashboard', <Sidebar collapsed={false} setCollapsed={vi.fn()} mobileOpen onCloseMobile={onClose} />);
    await userEvent.click(screen.getByRole('link', { name: 'sidebar.users' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Topbar', () => {
  it('mostra o nome da clínica ativa e abre o menu do usuário', async () => {
    setup('TenantOwner', '/dashboard', <Topbar onToggleMobileMenu={vi.fn()} />, 'Clínica Sol');
    expect(screen.getAllByText('Clínica Sol')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /Ana/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByText('Clínica Sol')).toHaveLength(2);
    expect(screen.queryByRole('menuitem', { name: 'topbar.editProfile' })).not.toBeInTheDocument();
  });

  it('só o paciente tem "editar perfil"; Esc fecha o menu', async () => {
    setup('User', '/home', <Topbar onToggleMobileMenu={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Ana/ }));
    expect(screen.getByRole('menuitem', { name: 'topbar.editProfile' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sair desfaz a sessão', async () => {
    const { container } = setup('User', '/home', <Topbar onToggleMobileMenu={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Ana/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'topbar.logout' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(container).toBeTruthy();
  });

  it('o botão de hambúrguer abre o menu lateral no celular', async () => {
    const toggle = vi.fn();
    setup('User', '/home', <Topbar onToggleMobileMenu={toggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'topbar.openMenu' }));
    expect(toggle).toHaveBeenCalled();
  });
});
