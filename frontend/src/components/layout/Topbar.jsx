import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logout } from '../../store/authSlice';
import { User, UserCheck, LogOut, ChevronDown, Shield, Building, Menu } from 'lucide-react';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { LogoMark } from '../brand/Logo';
import { enumLabel } from '../../utils/enums';

export const Topbar = ({ onToggleMobileMenu }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { activeTenant } = useSelector((state) => state.tenant);
  const { user } = useSelector((state) => state.auth);

  const roleName = user?.role || '';
  const roleLabel = enumLabel(t, 'role', roleName);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    dispatch(logout());
  };

  return (
    <header className="main-topbar">
      {/* Left side: Logo & Brand Name */}
      <div className="topbar-left">
        <button
          type="button"
          className="btn-mobile-menu-toggle"
          onClick={onToggleMobileMenu}
          aria-label={t('topbar.openMenu')}
        >
          <Menu size={20} />
        </button>
        <div className="topbar-logo">
          <LogoMark size={32} />
          <div className="brand-text">
            <span className="brand-name brand-wordmark">nutri<b>rev</b></span>
            <span className="brand-sub">{activeTenant?.name || t('topbar.defaultTagline')}</span>
          </div>
        </div>
      </div>

      {/* Right side: User Dropdown Menu */}
      <div className="topbar-right">
        <div className="user-dropdown-container" ref={dropdownRef}>
          <button
            type="button"
            className={`user-menu-trigger ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="user-avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="user-name">{user?.name || user?.email || t('topbar.userRole')}</span>
              <span className="user-role-badge">{roleLabel}</span>
            </div>
            <ChevronDown size={16} className={`dropdown-chevron ${dropdownOpen ? 'open' : ''}`} />
          </button>

          {/* Dropdown Content */}
          {dropdownOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="user-avatar-large">
                  <User size={24} />
                </div>
                <div className="dropdown-user-details">
                  <p className="dropdown-name">{user?.name || t('topbar.connectedUser')}</p>
                  <p className="dropdown-email">{user?.email}</p>
                  <div className="dropdown-badges">
                    <span className="badge-chip role-chip">
                      <Shield size={12} /> {roleLabel}
                    </span>
                    {activeTenant?.name && (
                      <span className="badge-chip tenant-chip">
                        <Building size={12} /> {activeTenant.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-menu-list">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                >
                  <UserCheck size={16} />
                  <span>{t('topbar.editProfile')}</span>
                </button>
                <LanguageSwitcher />
                {/* Last item MUST be logout */}
                <button
                  type="button"
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>{t('topbar.logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
