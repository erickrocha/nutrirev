import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { fetchUsers, createUser, updateUser, clearUserError } from '../../store/userSlice';
import { fetchTenants } from '../../store/tenantSlice';
import { X, Users, Plus, Edit2, CheckCircle, Building, Mail, Lock, User as UserIcon } from 'lucide-react';
import { enumLabel, ROLES } from '../../utils/enums';

export const UserManagementModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user: currentUser, isSysAdmin } = useSelector((state) => state.auth);
  const { usersList, loading, error } = useSelector((state) => state.user);
  const { tenantsList, activeTenant } = useSelector((state) => state.tenant);

  const isTenantOwner = currentUser?.role === ROLES.TENANT_OWNER;

  // State for Create/Edit Mode
  const [editingUserId, setEditingUserId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(ROLES.USER);
  const [tenantId, setTenantId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = useCallback(() => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole(ROLES.USER);
    setSuccessMsg('');
    setEnabled(true);
    dispatch(clearUserError());

    // Default tenant_id selection based on role
    if (isSysAdmin) {
      setTenantId(activeTenant?.id ? String(activeTenant.id) : '');
    } else if (isTenantOwner) {
      const ownerTenantId = currentUser?.tenant_id || activeTenant?.id;
      setTenantId(ownerTenantId ? String(ownerTenantId) : '');
    }
  }, [activeTenant?.id, currentUser?.tenant_id, dispatch, isSysAdmin, isTenantOwner]);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchUsers());
      dispatch(fetchTenants());
      resetForm();
    }
  }, [isOpen, dispatch, resetForm]);

  if (!isOpen) return null;

  const handleEditClick = (u) => {
    setEditingUserId(u.id);
    setName(u.name || '');
    setEmail(u.email || '');
    setPassword(''); // Leave empty unless changing
    setRole(u.role || ROLES.USER);
    setTenantId(u.tenant_id ? String(u.tenant_id) : '');
    setEnabled(u.enabled);
    setSuccessMsg('');
    dispatch(clearUserError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    dispatch(clearUserError());

    const selectedTenantIdParsed = tenantId ? parseInt(tenantId, 10) : null;

    const userData = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      tenantId: isTenantOwner ? (currentUser?.tenant_id || selectedTenantIdParsed) : selectedTenantIdParsed,
      enabled,
      firstLogin: false,
    };

    let resultAction;
    if (editingUserId) {
      resultAction = await dispatch(updateUser({ id: editingUserId, userData }));
    } else {
      resultAction = await dispatch(createUser(userData));
    }

    if (createUser.fulfilled.match(resultAction) || updateUser.fulfilled.match(resultAction)) {
      setSuccessMsg(
        editingUserId
          ? `Usuário "${email}" atualizado com sucesso!`
          : `Usuário "${email}" criado com sucesso!`
      );
      resetForm();
    }
  };

  const getTenantName = (tId) => {
    if (!tId) return 'Nenhum (SysAdmin)';
    const found = tenantsList.find((t) => t.id === tId);
    return found ? found.name : `Tenant #${tId}`;
  };

  const tenantOwnerTenantName = getTenantName(currentUser?.tenant_id || activeTenant?.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3>Gestão de Usuários — {isSysAdmin ? 'SysAdmin Control' : 'Tenant Admin'}</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '0.85rem', marginBottom: '20px' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* User Form (Insert & Edit) */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-primary)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '1rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-heading)', margin: 0 }}>
              {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
            </h4>
            {editingUserId && (
              <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                Cancelar Edição
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Name */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" required />
                <UserIcon size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
              </div>
            </div>

            {/* Email */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Email</label>
              <div style={{ position: 'relative' }}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@clinica.com" required />
                <Mail size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
              </div>
            </div>

            {/* Password */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Senha {editingUserId && '(Deixe em branco para não alterar)'}</label>
              <div style={{ position: 'relative' }}>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required={!editingUserId} />
                <Lock size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
              </div>
            </div>

            {/* Role Select */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Role / Função</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-alt)',
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.9rem',
                  color: 'var(--text-heading)',
                }}
              >
                {isSysAdmin && <option value={ROLES.SYS_ADMIN}>{enumLabel(t, 'role', ROLES.SYS_ADMIN)}</option>}
                <option value={ROLES.TENANT_OWNER}>{enumLabel(t, 'role', ROLES.TENANT_OWNER)}</option>
                <option value={ROLES.TENANT_USER}>{enumLabel(t, 'role', ROLES.TENANT_USER)}</option>
                <option value={ROLES.USER}>{enumLabel(t, 'role', ROLES.USER)}</option>
              </select>
            </div>

            {/* Tenant Selection logic based on user role */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Tenant (Clínica)</label>
              {isSysAdmin ? (
                /* SysAdmin: ComboBox with all tenants */
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-alt)',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.9rem',
                    color: 'var(--text-heading)',
                  }}
                >
                  <option value="">Nenhum (SysAdmin Global)</option>
                  {tenantsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (ID: {t.id})
                    </option>
                  ))}
                </select>
              ) : (
                /* TenantOwner: Read-only Tenant Name label */
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--badge-bg)',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Building size={16} />
                  <span>{tenantOwnerTenantName}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-body)', marginLeft: 'auto' }}>(Fixo)</span>
                </div>
              )}
            </div>

            {/* Status Enabled */}
            <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
              <input
                type="checkbox"
                id="enabledCheck"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="enabledCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem' }}>
                Usuário Ativo no Sistema
              </label>
            </div>
          </div>

          <button type="submit" className="btn-pill btn-primary" style={{ marginTop: '20px', width: '100%', justifyContent: 'center' }} disabled={loading}>
            <Plus size={16} />
            <span>{loading ? 'Salvando...' : editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</span>
          </button>
        </form>

        {/* Users Table List */}
        <div>
          <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.9rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-heading)', marginBottom: '16px' }}>
            Usuários Cadastrados ({usersList.length})
          </h4>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '14px', backgroundColor: 'var(--bg-alt)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', fontFamily: 'Jost, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Nome / Email</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'Jost, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Role</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'Jost, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Tenant</th>
                  <th style={{ padding: '12px 16px', fontFamily: 'Jost, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'Jost, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.75rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-body)' }}>
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>{u.name || 'Sem nome'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-body)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge-pill" style={{ margin: 0, padding: '4px 10px', fontSize: '0.7rem' }}>
                          {enumLabel(t, 'role', u.role)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-body)' }}>
                        {getTenantName(u.tenant_id)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: u.enabled ? '#059669' : '#DC2626', fontWeight: 600, fontSize: '0.75rem' }}>
                          {u.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          className="btn-pill btn-outline"
                          onClick={() => handleEditClick(u)}
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <Edit2 size={14} />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
