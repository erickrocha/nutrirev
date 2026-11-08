import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowRight, Lock, Mail, Shield, Sparkles } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { LanguageToggle } from '../../components/common/LanguageSwitcher';
import { clearError, loginUser } from '../../store/authSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

interface Values { email: string; password: string }

const FIELD = 'box-border w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] py-[14px] pl-11 pr-[14px] text-[.95rem] text-[var(--text-heading)] hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_rgba(29,111,209,.15)] focus:outline-none';
const LABEL = 'text-[.75rem] font-medium uppercase tracking-[.1em] text-[var(--text-heading)]';

export const LoginPage = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const schema = useMemo(() => yup.object({
    email: yup.string().trim().email(t('order.errors.email')).required(t('order.errors.required')),
    password: yup.string().required(t('order.errors.required')),
  }), [t]);
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: yupResolver(schema), defaultValues: { email: '', password: '' } });

  // Digitar de novo apaga o aviso de erro da tentativa anterior.
  const field = (name: keyof Values) => register(name, { onChange: () => { if (error) dispatch(clearError()); } });
  const submit = ({ email, password }: Values) => { dispatch(loginUser({ email: email.trim(), password })); };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--bg-primary)] min-[901px]:flex-row">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-[var(--bg-dark)] bg-[radial-gradient(circle_at_top_right,rgba(255,198,41,.18),transparent_60%)] px-8 py-10 text-white/85 min-[901px]:flex-1 min-[901px]:px-20 min-[901px]:py-[60px]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.1),rgba(0,0,0,.4))]" />
        <div className="relative z-[2] flex h-full flex-col justify-between gap-8">
          <div className="flex flex-col items-start gap-2 text-white">
            <Logo size={44} onDark />
            <p className="m-0 text-[.7rem] uppercase tracking-[.2em] text-white/70">{t('auth.brandTagline')}</p>
          </div>
          <div className="my-6 min-[901px]:my-10">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-white/10 px-4 py-[6px] text-[.75rem] uppercase tracking-[.15em] text-white"><Sparkles size={14} />{t('auth.badgeLuxury')}</span>
            <h1 className="mb-5 mt-0 text-[2rem] font-light leading-[1.3] tracking-[.08em] text-white min-[901px]:text-[2.4rem]">{t('auth.heroHeading1')}<br /><span className="font-medium text-[var(--accent-secondary)]">{t('auth.heroHeading2')}</span></h1>
            <p className="m-0 max-w-[520px] text-[1.05rem] font-light leading-[1.8] text-[#D8D0C5]">{t('auth.heroDescription')}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {([[Sparkles, 'featureSmartFormulas'], [Shield, 'featureSafety']] as const).map(([Icon, key]) => (
              <div key={key} className="flex items-start gap-[14px] rounded-2xl border border-white/20 bg-white/10 px-5 py-[18px]">
                <Icon size={20} className="mt-[2px] shrink-0 text-[var(--accent-secondary)]" />
                <div><h4 className="m-0 mb-1 text-[.9rem] tracking-wide text-white">{t(`auth.${key}`)}</h4><p className="m-0 text-[.8rem] leading-snug text-[#B8AF9F]">{t(`auth.${key}Desc`)}</p></div>
              </div>
            ))}
          </div>
          <footer className="text-[.75rem] tracking-wide text-white/60">
            <Link to="/" className="mb-[10px] inline-block text-[var(--accent-secondary)] no-underline hover:underline">{t('auth.backToSite')}</Link>
            <p className="m-0">{t('auth.copyright')}</p>
          </footer>
        </div>
      </aside>

      <main className="relative flex flex-1 items-center justify-center bg-[var(--bg-primary)] px-5 py-12 min-[901px]:p-[60px]">
        <LanguageToggle className="absolute right-6 top-6 text-[var(--text-body)]" />
        <section className="w-full max-w-[440px] rounded-3xl border border-[var(--border-color)] bg-[var(--bg-alt)] px-6 py-10 shadow-[0_20px_40px_rgba(15,42,71,.06)] min-[901px]:px-10 min-[901px]:py-12">
          <header className="mb-8 text-center">
            <h2 className="m-0 mb-2 text-[1.8rem] font-normal uppercase tracking-[.1em] text-[var(--text-heading)]">{t('auth.restrictedAccess')}</h2>
            <p className="m-0 text-[.88rem] text-[var(--text-body)]">{t('auth.enterCredentials')}</p>
          </header>

          {error && <div role="alert" className="mb-6 flex items-center gap-[10px] rounded-xl border border-red-400 bg-[#FDF2F2] px-4 py-3 text-[.85rem] text-red-800"><AlertCircle size={18} className="shrink-0 text-red-600" /><span>{error}</span></div>}

          <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className={LABEL}>{t('auth.corporateEmail')}</label>
              <div className="relative flex items-center">
                <Mail size={18} aria-hidden="true" className="pointer-events-none absolute left-[14px] text-[var(--text-body)]" />
                <input id="login-email" type="email" autoComplete="username" placeholder={t('auth.emailPlaceholder')} aria-invalid={Boolean(errors.email)} className={FIELD} {...field('email')} />
              </div>
              {errors.email && <small role="alert" className="text-[.72rem] text-red-700">{errors.email.message}</small>}
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className={LABEL}>{t('auth.accessPassword')}</label>
              <div className="relative flex items-center">
                <Lock size={18} aria-hidden="true" className="pointer-events-none absolute left-[14px] text-[var(--text-body)]" />
                <input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={Boolean(errors.password)} className={FIELD} {...field('password')} />
              </div>
              {errors.password && <small role="alert" className="text-[.72rem] text-red-700">{errors.password.message}</small>}
            </div>
            <button
              type="submit" disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-6 py-[14px] text-[.95rem] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >{loading ? <span>{t('auth.authenticating')}</span> : <><span>{t('auth.accessPanel')}</span><ArrowRight size={18} /></>}</button>
          </form>
        </section>
      </main>
    </div>
  );
};
