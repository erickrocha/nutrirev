import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, CreditCard, Lock, PanelLeft, PanelLeftClose } from 'lucide-react';
import { buildMenu } from '../../config/menu';
import { useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { ROLES } from '../../utils/enums';

interface Props {
  collapsed: boolean;
  setCollapsed: (update: (current: boolean) => boolean) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

type Expanded = Record<string, boolean>;

// O navegador pode negar o armazenamento (janela privada, dados bloqueados): a barra funciona sem ele.
const readExpanded = (key: string): Expanded => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
};
const writeExpanded = (key: string, value: Expanded) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sem armazenamento: o estado dura só a sessão */ }
};

export const Sidebar = ({ collapsed, setCollapsed, mobileOpen, onCloseMobile }: Props) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const subscriptionStatus =
    useAppSelector((state) => state.tenantSubscription?.status) ??
    user?.subscriptionStatus ??
    user?.subscription_status;
  const isBlocked = (user?.role === ROLES.TENANT_OWNER || user?.role === ROLES.TENANT_USER || !user?.role) && subscriptionStatus?.status === 'blocked';
  const role = user?.role ?? '';
  const sections = useMemo(() => buildMenu(role, t), [role, t]);
  const storageKey = `nutrirev.sidebarSections.${role || 'guest'}`;
  const [expanded, setExpanded] = useState<Expanded>(() => readExpanded(storageKey));

  useEffect(() => { setExpanded(readExpanded(storageKey)); }, [storageKey]);

  // Navegar para uma tela de uma seção recolhida reabre a seção (só ao navegar: recolher a seção atual por conta própria vale).
  useEffect(() => {
    const active = sections.find((section) => section.items.some((item) => item.path === location.pathname));
    if (!active) return;
    setExpanded((current) => {
      if (current[active.id] !== false) return current;
      const next = { ...current, [active.id]: true };
      writeExpanded(storageKey, next);
      return next;
    });
  }, [location.pathname, sections, storageKey]);

  const toggle = (id: string) => {
    const next = { ...expanded, [id]: expanded[id] === false };
    writeExpanded(storageKey, next);
    setExpanded(next);
  };

  return (
    <aside
      aria-label={t('sidebar.navigation')}
      className={[
        'fixed bottom-0 left-0 top-[80px] z-[90] box-border flex w-[280px] flex-col justify-between overflow-y-auto border-r border-[var(--border-color)] px-3 py-6 transition-transform duration-300',
        'bg-gradient-to-b from-[color-mix(in_srgb,var(--accent-primary)_16%,#fff)] via-white to-[color-mix(in_srgb,var(--accent-secondary)_28%,#fff)]',
        mobileOpen ? 'translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,.15)]' : '-translate-x-full',
        'min-[901px]:relative min-[901px]:inset-auto min-[901px]:z-auto min-[901px]:h-full min-[901px]:translate-x-0 min-[901px]:shadow-none min-[901px]:transition-[width]',
        collapsed ? 'min-[901px]:w-[72px]' : 'min-[901px]:w-[250px]',
      ].join(' ')}
    >
      <div>
        <div className={`mb-6 flex items-center px-2 ${collapsed ? 'justify-between min-[901px]:justify-center' : 'justify-between'}`}>
          {!collapsed && <span className="text-[.7rem] font-bold uppercase tracking-[.2em] text-[var(--text-body)]">{t('sidebar.navigation')}</span>}
          <button
            type="button" onClick={() => setCollapsed((current) => !current)} title={collapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
            aria-label={collapsed ? t('sidebar.expandMenu') : t('sidebar.collapseMenu')}
            className="flex items-center justify-center rounded-lg p-[6px] text-[var(--text-body)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-heading)]"
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex w-full flex-col">
          {isBlocked ? (
            <div className="mb-4 flex w-full flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                <Lock size={14} className="shrink-0" />
                <span>{t('tenantSubscription.accessBlockedMenu', 'Acesso Restrito')}</span>
              </div>
              <NavLink
                to={PATHS.SUBSCRIPTION_PAYMENT}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `box-border flex w-full items-center gap-3 rounded-[10px] py-[10px] text-[.85rem] no-underline transition-colors ${
                    collapsed ? 'justify-center px-3' : 'px-[14px]'
                  } ${
                    isActive
                      ? 'bg-[var(--badge-bg)] font-bold text-[var(--accent-primary)]'
                      : 'font-medium text-[var(--text-body)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-heading)]'
                  }`
                }
              >
                <CreditCard size={18} className="shrink-0" />
                {!collapsed && (
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {t('tenantSubscription.menuLabel', 'Pagar Assinatura')}
                  </span>
                )}
              </NavLink>
            </div>
          ) : (
            sections.map((section) => {
              const open = collapsed || expanded[section.id] !== false;
              return (
                <div key={section.id} className="mb-4 flex w-full flex-col gap-[2px]">
                  {!collapsed && (
                    <button
                      type="button"
                      onClick={() => toggle(section.id)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between bg-transparent px-4 pb-1 pt-2 text-left text-[.7rem] font-bold uppercase tracking-[.1em] text-[var(--text-body)] hover:text-[var(--text-heading)]"
                    >
                      <span>{section.title}</span>
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  {open &&
                    section.items.map(({ path, label, icon: Icon }) => (
                      <NavLink
                        key={path}
                        to={path}
                        title={label}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          `box-border flex w-full items-center gap-3 rounded-[10px] py-[10px] text-[.85rem] no-underline transition-colors ${
                            collapsed ? 'justify-center px-3' : 'px-[14px]'
                          } ${
                            isActive
                              ? 'bg-[var(--badge-bg)] font-bold text-[var(--accent-primary)]'
                              : 'font-medium text-[var(--text-body)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-heading)]'
                          }`
                        }
                      >
                        <Icon size={18} className="shrink-0" />
                        {!collapsed && (
                          <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                            {label}
                          </span>
                        )}
                      </NavLink>
                    ))}
                </div>
              );
            })
          )}
        </nav>
      </div>

      {!collapsed && <footer className="border-t border-[var(--border-color)] px-2 pt-4"><p className="m-0 text-center text-[.7rem] text-[var(--text-body)]">{t('sidebar.systemVersion')}</p></footer>}
    </aside>
  );
};
