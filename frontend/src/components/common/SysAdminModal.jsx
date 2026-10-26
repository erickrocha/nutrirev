import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { loginUser, clearError } from '../../store/authSlice';
import { fetchTenants, createTenant, setActiveTenant } from '../../store/tenantSlice';
import { X, ShieldCheck, Plus, CheckCircle, Lock, Mail, Building } from 'lucide-react';

export const SysAdminModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, isSysAdmin, loading: authLoading, error: authError } = useSelector((state) => state.auth);
  const { tenantsList, loading: tenantLoading, error: tenantError } = useSelector((state) => state.tenant);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated && isSysAdmin) {
      dispatch(fetchTenants());
    }
  }, [isAuthenticated, isSysAdmin, dispatch]);

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    dispatch(clearError());
    const res = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(res)) {
      dispatch(fetchTenants());
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!newTenantName.trim()) return;
    setSuccessMsg('');
    const res = await dispatch(createTenant(newTenantName.trim()));
    if (createTenant.fulfilled.match(res)) {
      setSuccessMsg(`Tenant "${newTenantName}" criado com sucesso no backend!`);
      setNewTenantName('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3>SysAdmin Portal — Gestão de Tenants</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!isAuthenticated ? (
          <form onSubmit={handleLogin}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: '20px' }}>
              Entre com as credenciais de SysAdmin configuradas no arquivo <code>.env</code> do backend Rust.
            </p>

            {authError && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', marginBottom: '16px' }}>
                {authError}
              </div>
            )}

            <div className="form-group">
              <label>Email do SysAdmin</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sysadmin@nutrirev.com"
                  required
                />
                <Mail size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
              </div>
            </div>

            <div className="form-group">
              <label>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Lock size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-body)' }} />
              </div>
            </div>

            <button type="submit" className="btn-pill btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} disabled={authLoading}>
              <span>{authLoading ? 'Autenticando...' : 'Entrar como SysAdmin'}</span>
            </button>
          </form>
        ) : (
          <div>
            {!isSysAdmin ? (
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.9rem' }}>
                Você está autenticado como usuário padrão. Apenas usuários com a role <strong>SysAdmin</strong> podem criar e gerenciar tenants.
              </div>
            ) : (
              <div>
                {successMsg && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', backgroundColor: '#D1FAE5', color: '#065F46', fontSize: '0.85rem', marginBottom: '20px' }}>
                    <CheckCircle size={18} />
                    <span>{successMsg}</span>
                  </div>
                )}

                {tenantError && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '0.85rem', marginBottom: '16px' }}>
                    {tenantError}
                  </div>
                )}

                {/* Form: Create New Tenant */}
                <form onSubmit={handleCreateTenant} style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>
                    Criar Novo Tenant (Clínica / Marca)
                  </label>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      value={newTenantName}
                      onChange={(e) => setNewTenantName(e.target.value)}
                      placeholder="Ex: Aesthetics Hub, Dermalux Clinic..."
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        fontFamily: 'Jost, sans-serif',
                        fontSize: '0.9rem',
                      }}
                      required
                    />
                    <button type="submit" className="btn-pill btn-primary" style={{ padding: '12px 20px' }} disabled={tenantLoading}>
                      <Plus size={16} />
                      <span>Criar</span>
                    </button>
                  </div>
                </form>

                {/* List: Existing Tenants */}
                <div>
                  <h4 style={{ fontFamily: 'Jost, sans-serif', fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-heading)', marginBottom: '12px' }}>
                    Tenants Cadastrados no Banco Rust
                  </h4>

                  <div className="tenant-list-box">
                    {tenantsList.map((t) => (
                      <div key={t.id || t.name} className="tenant-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Building size={18} style={{ color: 'var(--accent-primary)' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                            {t.uuid && <div style={{ fontSize: '0.7rem', color: 'var(--text-body)' }}>UUID: {t.uuid.substring(0, 18)}...</div>}
                          </div>
                        </div>

                        <button
                          className="btn-pill btn-outline btn-select"
                          onClick={() => {
                            dispatch(setActiveTenant(t));
                            setSuccessMsg(`Tema alterado para: ${t.name}`);
                          }}
                        >
                          Aplicar Tema
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
