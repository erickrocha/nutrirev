import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchUsers, createUser, updateUser, clearUserError } from '../../store/userSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { enumLabel, ROLES } from '../../utils/enums';
import { Plus, Edit2, UserPlus, RefreshCw, X, Shield, Building, CheckCircle, XCircle } from 'lucide-react';

export const UserManagement = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { usersList, loading, error } = useSelector((state) => state.user);
  const { tenantsList } = useSelector((state) => state.tenant);
  const { user: currentUser } = useSelector((state) => state.auth);

  const roleName = currentUser?.role || '';
  const isSysAdmin = roleName === ROLES.SYS_ADMIN;
  const currentUserTenantId = currentUser?.tenantId || currentUser?.tenant_id || null;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.USER,
    firstLogin: true,
    tenantId: isSysAdmin ? '' : (currentUserTenantId || ''),
    enabled: true,
  });

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchTenants());
  }, [dispatch]);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: ROLES.USER,
      tenantId: isSysAdmin ? (tenantsList[0]?.id || '') : (currentUserTenantId || ''),
      enabled: true,
    });
    dispatch(clearUserError());
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name || '',
      email: userToEdit.email || '',
      password: '', // Leave blank unless changing
      role: userToEdit.role || ROLES.USER,
      firstLogin: userToEdit.firstLogin || userToEdit.first_login || true,
      tenantId: userToEdit.tenantId || userToEdit.tenant_id || (isSysAdmin ? '' : currentUserTenantId),
      enabled: userToEdit.enabled !== undefined ? userToEdit.enabled : true,
    });
    dispatch(clearUserError());
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      enabled: formData.enabled,
      firstLogin: formData.firstLogin,
      tenantId: formData.tenantId ? parseInt(formData.tenantId, 10) : null,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    if (editingUser) {
      const res = await dispatch(updateUser({ id: editingUser.id, userData: payload }));
      if (!res.error) handleCloseModal();
    } else {
      if (!formData.password) {
        alert(t('users.passwordRequired'));
        return;
      }
      const res = await dispatch(createUser(payload));
      if (!res.error) handleCloseModal();
    }
  };

  const displayedUsers = isSysAdmin
    ? usersList
    : usersList.filter((u) => {
      const uTenantId = u.tenantId || u.tenant_id;
      return uTenantId === currentUserTenantId;
    });

  const getTenantName = (tenantId) => {
    if (!tenantId) return t('users.noTenantGlobal');
    const found = tenantsList.find((t_item) => t_item.id === parseInt(tenantId, 10));
    return found ? found.name : `Tenant #${tenantId}`;
  };

  return (
    <div className="user-management-container">
      {/* Top Controls Header */}
      <div className="management-header">
        <div>
          <h2 className="section-title">{t('users.title')}</h2>
          <p className="section-subtitle">
            {isSysAdmin
              ? t('users.subtitleSysAdmin')
              : t('users.subtitleOwner')}
          </p>
        </div>

        <div className="header-action-buttons">
          <button
            type="button"
            className="btn-action-outline"
            onClick={() => dispatch(fetchUsers())}
            title={t('common.refreshList')}
          >
            <RefreshCw size={16} />
            <span>{t('common.refresh')}</span>
          </button>

          <button
            type="button"
            className="btn-action-primary"
            onClick={handleOpenAddModal}
          >
            <Plus size={18} />
            <span>{t('users.addUser')}</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-card">
        {loading && usersList.length === 0 ? (
          <div className="table-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>{t('users.loadingUsers')}</p>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="table-empty-state">
            <UserPlus size={36} />
            <p>{t('users.noUsersFound')}</p>
            <button type="button" className="btn-action-primary" onClick={handleOpenAddModal}>
              <Plus size={16} />
              <span>{t('users.addFirstUser')}</span>
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>{t('users.nameEmail')}</th>
                  <th>{t('users.permission')}</th>
                  <th>{t('users.tenant')}</th>
                  <th>{t('common.status')}</th>
                  <th style={{ textAlign: 'right' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((u) => {
                  const uTenantId = u.tenantId || u.tenant_id;
                  const uRole = u.role || '';
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-table-info">
                          <span className="user-table-name">{u.name || t('common.noName')}</span>
                          <span className="user-table-email">{u.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge role-${uRole}`}>
                          <Shield size={12} />
                          {enumLabel(t, 'role', uRole)}
                        </span>
                      </td>
                      <td>
                        <span className="tenant-name-tag">
                          <Building size={12} />
                          {getTenantName(uTenantId)}
                        </span>
                      </td>
                      <td>
                        {u.enabled !== false ? (
                          <span className="status-badge status-active">
                            <CheckCircle size={12} /> {t('common.active')}
                          </span>
                        ) : (
                          <span className="status-badge status-inactive">
                            <XCircle size={12} /> {t('common.inactive')}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-table-edit"
                          onClick={() => handleOpenEditModal(u)}
                          title={t('users.editUser')}
                        >
                          <Edit2 size={16} />
                          <span>{t('common.edit')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? t('users.editUser') : t('users.addNewUser')}
              </h3>
              <button type="button" className="btn-modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="modal-error-alert">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>{t('users.fullName')}</label>
                <input
                  type="text"
                  placeholder={t('users.fullNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t('users.corporateEmail')}</label>
                <input
                  type="email"
                  placeholder={t('users.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  {editingUser ? t('users.newPassword') : t('users.accessPassword')}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>{t('users.accessLevel')}</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value={ROLES.TENANT_USER}>{t('users.tenantUser')}</option>
                    <option value={ROLES.TENANT_OWNER}>{t('users.tenantOwnerRole')}</option>
                    <option value={ROLES.USER}>{t('users.standardUser')}</option>
                    {isSysAdmin && <option value={ROLES.SYS_ADMIN}>{enumLabel(t, 'role', ROLES.SYS_ADMIN)}</option>}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('users.associatedTenant')}</label>
                  {isSysAdmin ? (
                    <select
                      value={formData.tenantId}
                      onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    >
                      <option value="">{t('users.noTenantGlobal')}</option>
                      {tenantsList.map((t_item) => (
                        <option key={t_item.id} value={t_item.id}>
                          {t_item.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={getTenantName(currentUserTenantId)}
                      className="input-disabled"
                    />
                  )}
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  <span>{t('users.activeInSystem')}</span>
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={handleCloseModal}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-modal-submit" disabled={loading}>
                  {loading ? t('common.saving') : editingUser ? t('common.saveChanges') : t('users.registerUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
