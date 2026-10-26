import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity, ArrowRight, BarChart3, CalendarClock, CheckCircle2, ClipboardList,
  CreditCard, LineChart, Salad, ScanLine, Smartphone, Sparkles, Target, Users,
} from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { LanguageToggle } from '../../components/common/LanguageSwitcher';
import { api } from '../../services/api';
import { formatPrice } from '../../utils/format';

// Copy fica nos arquivos de i18n (`site.*`); os planos vêm da tabela `business_plan` via
// GET /public/business-plans. Ícones ficam aqui, na mesma ordem de `site.features.items`.
const FEATURE_ICONS = [ClipboardList, Target, Salad, ScanLine, Activity, LineChart, CreditCard, Users, BarChart3];

const SITE_URL = 'https://nutrirev.com.br';

// Uma busca só por carregamento da página; Plans, Hero e o JSON-LD leem o mesmo resultado.
let plansRequest;
const usePlans = () => {
  const [state, setState] = useState({ plans: null, failed: false });
  useEffect(() => {
    plansRequest ||= api.get('/public/business-plans').then((res) => res.data);
    let active = true;
    plansRequest
      .then((plans) => active && setState({ plans: [...plans].sort((a, b) => a.priceInCents - b.priceInCents), failed: false }))
      .catch(() => {
        plansRequest = undefined; // permite nova tentativa no próximo mount
        if (active) setState({ plans: null, failed: true });
      });
    return () => { active = false; };
  }, []);
  return state;
};

const useSite = () => {
  const { t, i18n } = useTranslation();
  const list = (key) => t(`site.${key}`, { returnObjects: true });
  return { t: (key, opts) => t(`site.${key}`, opts), list, lang: i18n.language?.startsWith('en') ? 'en' : 'pt' };
};

// JSON-LD gerado a partir da mesma copy que a página renderiza — preço e FAQ
// têm uma fonte só. O Google executa JS, então o schema injetado aqui é lido.
const StructuredData = () => {
  const { t, list, lang } = useSite();
  const { plans } = usePlans();
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'NutriRev',
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'NutriRev',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        url: SITE_URL,
        inLanguage: lang === 'en' ? 'en-US' : 'pt-BR',
        description: t('seo.description'),
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: (plans || []).map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: (plan.priceInCents / 100).toFixed(2),
          priceCurrency: 'BRL',
          url: `${SITE_URL}/#planos`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: list('faq.items').map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  );
};

const Header = () => {
  const { t } = useSite();
  return (
    <header className="lp-header">
      <div className="container lp-header-inner">
        <Link to="/" className="lp-brand" aria-label={t('nav.home')}>
          <Logo />
          <span className="lp-brand-tagline">{t('nav.tagline')}</span>
        </Link>
        <nav className="lp-nav" aria-label={t('nav.aria')}>
          <a href="#funcionalidades">{t('nav.features')}</a>
          <a href="#como-funciona">{t('nav.how')}</a>
          <a href="#planos">{t('nav.plans')}</a>
          <a href="#duvidas">{t('nav.faq')}</a>
        </nav>
        <LanguageToggle className="lp-lang" />
        <Link to="/login" className="lp-btn lp-btn-primary lp-header-cta">
          {t('access')} <ArrowRight size={17} />
        </Link>
      </div>
    </header>
  );
};

const Hero = () => {
  const { t, list, lang } = useSite();
  const { plans } = usePlans();
  const from = plans?.length ? formatPrice(plans[0].priceInCents, lang) : null;
  return (
    <section className="lp-hero">
      <div className="container lp-hero-inner">
        <p className="lp-badge"><Sparkles size={13} /> {t('hero.badge')}</p>
        <h1>
          {t('hero.title')} <span>{t('hero.titleAccent')}</span>
        </h1>
        <p className="lp-hero-sub">{t('hero.sub')}</p>
        <div className="lp-hero-actions">
          <a href="#planos" className="lp-btn lp-btn-primary lp-btn-lg">
            {t('hero.seePlans')} <ArrowRight size={18} />
          </a>
          <Link to="/login" className="lp-btn lp-btn-outline lp-btn-lg">{t('access')}</Link>
        </div>
        <ul className="lp-hero-strip">
          {list('hero.strip').map((item) => (
            <li key={item}><CheckCircle2 size={16} /> {item}</li>
          ))}
          {from && <li><CheckCircle2 size={16} /> {t('hero.from', { price: from })}</li>}
        </ul>
      </div>
    </section>
  );
};

const Audiences = () => {
  const { t, list } = useSite();
  return (
    <section className="lp-section" id="para-quem">
      <div className="container">
        <h2>{t('audiences.title')}</h2>
        <p className="lp-section-sub">{t('audiences.sub')}</p>
        <div className="lp-grid lp-grid-3">
          {list('audiences.items').map((item) => (
            <article className="lp-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const { t, list } = useSite();
  return (
    <section className="lp-section lp-section-alt" id="funcionalidades">
      <div className="container">
        <h2>{t('features.title')}</h2>
        <p className="lp-section-sub">{t('features.sub')}</p>
        <div className="lp-grid lp-grid-3">
          {list('features.items').map(({ title, text }, index) => {
            const Icon = FEATURE_ICONS[index];
            return (
              <article className="lp-card lp-feature" key={title}>
                <span className="lp-icon" aria-hidden="true"><Icon size={20} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const Steps = () => {
  const { t, list } = useSite();
  return (
    <section className="lp-section" id="como-funciona">
      <div className="container">
        <h2>{t('steps.title')}</h2>
        <p className="lp-section-sub">{t('steps.sub')}</p>
        <ol className="lp-steps">
          {list('steps.items').map((step, index) => (
            <li key={step.title}>
              <span className="lp-step-number" aria-hidden="true">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const PHONE_ICONS = [CalendarClock, ScanLine, Activity, LineChart];

const PatientApp = () => {
  const { t, list } = useSite();
  return (
    <section className="lp-section lp-section-dark">
      <div className="container lp-split">
        <div>
          <p className="lp-badge lp-badge-onDark"><Smartphone size={13} /> {t('app.badge')}</p>
          <h2>{t('app.title')}</h2>
          <p className="lp-section-sub">{t('app.sub')}</p>
          <ul className="lp-check-list">
            {list('app.list').map((item) => (
              <li key={item}><CheckCircle2 size={17} /> {item}</li>
            ))}
          </ul>
        </div>
        <div className="lp-split-visual" aria-hidden="true">
          <div className="lp-phone">
            <span className="lp-phone-notch" />
            {list('app.phone').map((row, index) => {
              const Icon = PHONE_ICONS[index];
              return (
                <div className={`lp-phone-row${index === 2 ? ' lp-phone-row-accent' : ''}`} key={row}>
                  <Icon size={16} /> {row}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const periodLabel = (t, days) => {
  if (days === 30) return t('plans.period_month');
  if (days === 365) return t('plans.period_year');
  return t('plans.period_days', { count: days });
};

const Plans = () => {
  const { t, lang } = useSite();
  const { plans, failed } = usePlans();
  const highlightIndex = plans?.length >= 3 ? Math.floor(plans.length / 2) : -1;
  return (
    <section className="lp-section" id="planos">
      <div className="container">
        <h2>{t('plans.title')}</h2>
        <p className="lp-section-sub">{t('plans.sub')}</p>
        {failed && <p className="lp-section-sub" role="alert">{t('plans.unavailable')}</p>}
        <div className="lp-grid lp-grid-3 lp-plans">
          {(plans || []).map((plan, index) => {
            const highlight = index === highlightIndex;
            const features = [
              t('plans.users', { count: plan.availableUsers }),
              t('plans.aiQuota', { count: plan.dailyAiQuota }),
              ...(plan.tiers.length ? [t('plans.tiers')] : []),
            ];
            return (
              <article className={`lp-card lp-plan${highlight ? ' is-highlight' : ''}`} key={plan.name}>
                {highlight && <span className="lp-plan-flag">{t('plans.flag')}</span>}
                <h3>{plan.name}</h3>
                <p className="lp-plan-price">
                  {formatPrice(plan.priceInCents, lang)}
                  <span className="lp-plan-period">{periodLabel(t, plan.periodDays)}</span>
                </p>
                <ul className="lp-check-list">
                  {features.map((feature) => (
                    <li key={feature}><CheckCircle2 size={17} /> {feature}</li>
                  ))}
                </ul>
                <Link to={`/contratar/${plan.uuid}`} className={`lp-btn ${highlight ? 'lp-btn-primary' : 'lp-btn-accent'} lp-btn-block`}>
                  {t('plans.start', { name: plan.name })}
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const Faq = () => {
  const { t, list } = useSite();
  return (
    <section className="lp-section" id="duvidas">
      <div className="container lp-faq-wrap">
        <h2>{t('faq.title')}</h2>
        <div className="lp-faq">
          {list('faq.items').map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

const FinalCta = () => {
  const { t } = useSite();
  return (
    <section className="lp-cta">
      <div className="container">
        <h2>{t('cta.title')}</h2>
        <p>{t('cta.text')}</p>
        <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
          {t('access')} <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
};

const Footer = () => {
  const { t } = useSite();
  return (
    <footer className="lp-footer">
      <div className="container lp-footer-inner">
        <div className="lp-footer-brand">
          <Logo size={32} />
          <p>{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.product')}>
          <h2>{t('footer.product')}</h2>
          <a href="#funcionalidades">{t('nav.features')}</a>
          <a href="#planos">{t('nav.plans')}</a>
          <a href="#duvidas">{t('footer.faq')}</a>
        </nav>
        <nav aria-label={t('footer.access')}>
          <h2>{t('footer.access')}</h2>
          <Link to="/login">{t('access')}</Link>
        </nav>
        <nav aria-label={t('footer.legal')}>
          <h2>{t('footer.legal')}</h2>
          <a href="/termos-de-uso">{t('footer.terms')}</a>
          <a href="/politica-de-privacidade">{t('footer.privacy')}</a>
        </nav>
      </div>
      <div className="container lp-footer-bottom">
        <p>© {new Date().getFullYear()} NutriRev · nutrirev.com.br</p>
      </div>
    </footer>
  );
};

export const LandingPage = () => {
  const { t } = useSite();
  useEffect(() => {
    document.title = `NutriRev — ${t('hero.badge')}`;
  });
  return (
    <div className="landing-page">
      <StructuredData />
      <Header />
      <main>
        <Hero />
        <Audiences />
        <Features />
        <Steps />
        <PatientApp />
        <Plans />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
};
