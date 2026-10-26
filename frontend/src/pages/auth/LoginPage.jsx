import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginUser, clearError } from '../../store/authSlice';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  const handleInputChange = (setter) => (e) => {
    if (error) dispatch(clearError());
    setter(e.target.value);
  };

  return (
    <div className="login-split-page">
      {/* LEFT SIDE - Marca NutriRev */}
      <div className="login-split-left">
        <div className="left-overlay"></div>
        <div className="left-content">
          <div className="left-brand">
            <Logo size={44} />
            <p className="brand-tagline">{t('auth.brandTagline')}</p>
          </div>

          <div className="philosophy-hero">
            <span className="badge-luxury">
              <Sparkles size={14} /> {t('auth.badgeLuxury')}
            </span>
            <h1 className="hero-heading">
              {t('auth.heroHeading1')}<br />
              <span>{t('auth.heroHeading2')}</span>
            </h1>
            <p className="hero-description">
              {t('auth.heroDescription')}
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon"><Sparkles size={20} /></div>
              <div>
                <h4>{t('auth.featureSmartFormulas')}</h4>
                <p>{t('auth.featureSmartFormulasDesc')}</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Shield size={20} /></div>
              <div>
                <h4>{t('auth.featureSafety')}</h4>
                <p>{t('auth.featureSafetyDesc')}</p>
              </div>
            </div>
          </div>

          <div className="left-footer">
            <Link to="/" className="back-to-site">{t('auth.backToSite')}</Link>
            <p>{t('auth.copyright')}</p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Login Input Form */}
      <div className="login-split-right">
        <div className="login-card">
          <div className="card-header">
            <h3>{t('auth.restrictedAccess')}</h3>
            <p>{t('auth.enterCredentials')}</p>
          </div>

          {error && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={18} className="error-icon" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email">{t('auth.corporateEmail')}</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={handleInputChange(setEmail)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">{t('auth.accessPassword')}</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={handleInputChange(setPassword)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-login-submit"
              disabled={loading}
            >
              {loading ? (
                <span>{t('auth.authenticating')}</span>
              ) : (
                <>
                  <span>{t('auth.accessPanel')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
