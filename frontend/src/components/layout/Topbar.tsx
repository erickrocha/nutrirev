import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building, ChevronDown, LogOut, Menu, Shield, User, UserCheck } from 'lucide-react';
import { LogoMark } from '../brand/Logo';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { logout } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { enumLabel, ROLES } from '../../utils/enums';

const ITEM = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[.88rem] text-[var(--text-heading)] hover:bg-[var(--bg-primary)]';

export const Topbar = ({ onToggleMobileMenu }: { onToggleMobileMenu: () => void }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const activeTenant = useAppSelector((state) => state.tenant.activeTenant);
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const roleName = user?.role || '';
  const roleLabel = enumLabel(t, 'role', roleName);

  // Fecha o menu ao clicar fora ou apertar Esc.
  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKeyDown); };
  }, []);

  return (
    <header className="sticky top-0 z-[100] flex h-[80px] items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-alt)] px-4 shadow-sm min-[901px]:px-8">
      <div className="flex items-center">
        <button type="button" onClick={onToggleMobileMenu} aria-label={t('topbar.openMenu')} className="mr-2 flex items-center justify-center rounded-lg p-2 text-[var(--text-heading)] hover:bg-[var(--bg-primary)] min-[901px]:hidden">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3 text-[var(--accent-primary)]">
          <LogoMark size={32} />
          <div className="flex flex-col">
            <span className="font-['Jost',sans-serif] text-[1.2rem] font-light leading-none tracking-tight text-[var(--text-heading)] [&_b]:font-bold [&_b]:text-[var(--accent-primary)]">nutri<b>rev</b></span>
            <span className="text-[.65rem] uppercase tracking-[.2em] text-[var(--text-body)]">{activeTenant?.name || t('topbar.defaultTagline')}</span>
          </div>
        </div>
      </div>

      <div className="relative" ref={menu}>
        <button
          type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="true"
          className={`flex items-center gap-3 rounded-full border px-4 py-2 hover:border-[var(--accent-primary)] hover:bg-[var(--badge-bg)] ${open ? 'border-[var(--accent-primary)] bg-[var(--badge-bg)]' : 'border-[var(--border-color)] bg-[var(--bg-primary)]'}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white"><User size={18} /></span>
          <span className="hidden flex-col items-start text-left sm:flex">
            <span className="text-[.85rem] font-medium text-[var(--text-heading)]">{user?.name || user?.email || t('topbar.userRole')}</span>
            <span className="text-[.65rem] font-bold uppercase tracking-wide text-[var(--accent-primary)]">{roleLabel}</span>
          </span>
          <ChevronDown size={16} className={`text-[var(--text-body)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-[1000] w-[280px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-alt)] p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white"><User size={24} /></span>
              <div className="min-w-0">
                <p className="m-0 truncate font-semibold text-[var(--text-heading)]">{user?.name || t('topbar.connectedUser')}</p>
                <p className="m-0 truncate text-[.8rem] text-[var(--text-body)]">{user?.email}</p>
                <div className="mt-2 flex flex-wrap gap-1 text-[.7rem] font-semibold">
                  <span className="flex items-center gap-1 rounded-full bg-[var(--badge-bg)] px-2 py-[2px] text-[var(--accent-primary)]"><Shield size={12} />{roleLabel}</span>
                  {activeTenant?.name && <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-[2px] text-slate-600"><Building size={12} />{activeTenant.name}</span>}
                </div>
              </div>
            </div>
            <hr className="my-3 border-0 border-t border-[var(--border-color)]" />
            <div className="flex flex-col">
              {roleName === ROLES.USER && (
                <button type="button" role="menuitem" className={ITEM} onClick={() => { setOpen(false); navigate(PATHS.SETTINGS); }}>
                  <UserCheck size={16} /><span>{t('topbar.editProfile')}</span>
                </button>
              )}
              <LanguageSwitcher />
              {/* O último item é sempre sair. */}
              <button type="button" role="menuitem" className={`${ITEM} text-red-600 hover:bg-red-50`} onClick={() => { setOpen(false); dispatch(logout()); }}>
                <LogOut size={16} /><span>{t('topbar.logout')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
