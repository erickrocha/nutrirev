import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Activity, ArrowRight, BarChart3, CalendarClock, CheckCircle2, ClipboardList,
  CreditCard, LineChart, Salad, ScanLine, Smartphone, Sparkles, Target, Users, type LucideIcon,
} from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { BADGE, BTN, BTN_LG, BTN_PRIMARY, CARD, HEADING } from '../../components/landing/styles';
import { Container } from '../../components/landing/Container';
import { PublicHeader } from '../../components/landing/PublicHeader';
import { fetchPublicPlans } from '../../store/planOrderSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { formatPrice, type Lang } from '../../utils/format';

// Copy fica nos arquivos de i18n (`site.*`); os planos vêm de GET /public/business-plans.
// Ícones ficam aqui, na mesma ordem de `site.features.items`.
const FEATURE_ICONS: LucideIcon[] = [ClipboardList, Target, Salad, ScanLine, Activity, LineChart, CreditCard, Users, BarChart3];
const PHONE_ICONS: LucideIcon[] = [CalendarClock, ScanLine, Activity, LineChart];
const SITE_URL = 'https://nutrirev.com.br';

interface Titled { title: string; text: string }
interface Faq { q: string; a: string }

const GRID = 'grid grid-cols-[repeat(auto-fit,minmax(270px,1fr))] gap-5 min-[1100px]:grid-cols-3';
const SUB = 'mx-auto mb-10 max-w-[64ch] text-center text-base';
const H2 = `${HEADING} mb-3 mt-0 text-center text-[clamp(1.6rem,3.4vw,2.3rem)] font-medium`;
const H3 = `${HEADING} mb-3 mt-0 text-[1.06rem] font-medium`;

const useSite = () => {
  const { t, i18n } = useTranslation();
  const lang: Lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  return {
    t: (key: string, opts?: Record<string, unknown>) => t(`site.${key}`, opts) as string,
    list: <T,>(key: string) => {
      const value = t(`site.${key}`, { returnObjects: true });
      return (Array.isArray(value) ? value : []) as T[];
    },
    lang,
  };
};

const Section = ({ id, tone = 'base', children }: { id?: string; tone?: 'base' | 'alt' | 'dark'; children: ReactNode }) => {
  const tones = {
    base: 'bg-[var(--bg-alt)]',
    alt: 'bg-[var(--bg-primary)]',
    dark: 'bg-[var(--bg-dark)] text-white/80 [&_h2]:text-white [&_h3]:text-white',
  };
  return <section id={id} className={`py-[52px] min-[561px]:py-[72px] ${tones[tone]}`}>{children}</section>;
};

const CheckList = ({ items, accent = false }: { items: string[]; accent?: boolean }) => (
  <ul className="m-0 mt-[22px] grid list-none gap-[11px] p-0 text-[.94rem]">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-[10px]">
        <CheckCircle2 size={17} className={`mt-[2px] shrink-0 ${accent ? 'text-[var(--accent-secondary)]' : 'text-[var(--accent-primary)]'}`} />{item}
      </li>
    ))}
  </ul>
);

// JSON-LD gerado da mesma copy que a página renderiza — preço e FAQ têm uma fonte só.
const StructuredData = () => {
  const { t, list, lang } = useSite();
  const plans = useAppSelector((state) => state.planOrder.publicPlans) ?? [];
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: 'NutriRev', url: SITE_URL, logo: `${SITE_URL}/favicon.svg` },
      {
        '@type': 'SoftwareApplication', name: 'NutriRev', applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android, iOS',
        url: SITE_URL, inLanguage: lang === 'en' ? 'en-US' : 'pt-BR', description: t('seo.description'),
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: plans.map((plan) => ({ '@type': 'Offer', name: plan.name, price: (plan.priceInCents / 100).toFixed(2), priceCurrency: 'BRL', url: `${SITE_URL}/#planos` })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: list<Faq>('faq.items').map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }} />;
};

const Header = () => {
  const { t } = useSite();
  const nav = [['funcionalidades', 'nav.features'], ['como-funciona', 'nav.how'], ['planos', 'nav.plans'], ['duvidas', 'nav.faq']];
  return (
    <PublicHeader
      tagline={t('nav.tagline')}
      nav={
        <nav aria-label={t('nav.aria')} className="hidden gap-[26px] min-[901px]:flex">
          {nav.map(([id, key]) => <a key={id} href={`#${id}`} className="text-[.92rem] text-[var(--text-body)] no-underline transition-colors hover:text-[var(--accent-primary)]">{t(key)}</a>)}
        </nav>
      }
      action={<Link to="/login" className={BTN_PRIMARY}>{t('access')} <ArrowRight size={17} /></Link>}
    />
  );
};

const Hero = () => {
  const { t, list, lang } = useSite();
  const plans = useAppSelector((state) => state.planOrder.publicPlans);
  const from = plans?.length ? formatPrice(plans[0].priceInCents, lang) : null;
  return (
    <section className="bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,var(--badge-accent-bg),transparent_70%)] bg-[var(--bg-primary)] pb-[52px] pt-14 text-center min-[561px]:pb-[72px] min-[561px]:pt-[84px]">
      <Container>
        <p className={`${BADGE} m-0 bg-[var(--badge-accent-bg)] text-[var(--text-heading)]`}><Sparkles size={13} /> {t('hero.badge')}</p>
        <h1 className={`${HEADING} mx-auto mb-4 mt-[18px] max-w-[20ch] text-[clamp(2.1rem,5.2vw,3.4rem)] font-medium`}>
          {t('hero.title')} <span className="block text-[var(--accent-primary)]">{t('hero.titleAccent')}</span>
        </h1>
        <p className="mx-auto mb-[30px] max-w-[62ch] text-[1.08rem]">{t('hero.sub')}</p>
        <div className="flex flex-wrap justify-center gap-[14px]">
          <a href="#planos" className={`${BTN_PRIMARY} ${BTN_LG} max-[560px]:w-full`}>{t('hero.seePlans')} <ArrowRight size={18} /></a>
          <Link to="/login" className={`${BTN} ${BTN_LG} border-[var(--border-color)] text-[var(--text-heading)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] max-[560px]:w-full`}>{t('access')}</Link>
        </div>
        <ul className="m-0 mt-[34px] flex list-none flex-wrap justify-center gap-[26px] p-0 text-[.88rem]">
          {[...list<string>('hero.strip'), ...(from ? [t('hero.from', { price: from })] : [])].map((item) => (
            <li key={item} className="flex items-center gap-[7px]"><CheckCircle2 size={16} className="shrink-0 text-[var(--accent-primary)]" /> {item}</li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

const Audiences = () => {
  const { t, list } = useSite();
  return (
    <Section id="para-quem">
      <Container>
        <h2 className={H2}>{t('audiences.title')}</h2>
        <p className={SUB}>{t('audiences.sub')}</p>
        <div className={GRID}>
          {list<Titled>('audiences.items').map((item) => (
            <article key={item.title} className={CARD}><h3 className={H3}>{item.title}</h3><p className="m-0 text-[.94rem]">{item.text}</p></article>
          ))}
        </div>
      </Container>
    </Section>
  );
};

const Features = () => {
  const { t, list } = useSite();
  return (
    <Section id="funcionalidades" tone="alt">
      <Container>
        <h2 className={H2}>{t('features.title')}</h2>
        <p className={SUB}>{t('features.sub')}</p>
        <div className={GRID}>
          {list<Titled>('features.items').map(({ title, text }, index) => {
            const Icon = FEATURE_ICONS[index] ?? ClipboardList;
            return (
              <article key={title} className={CARD}>
                <span aria-hidden="true" className="mb-4 inline-flex size-[42px] items-center justify-center rounded-xl bg-[var(--badge-accent-bg)] text-[var(--text-heading)]"><Icon size={20} /></span>
                <h3 className={H3}>{title}</h3><p className="m-0 text-[.94rem]">{text}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </Section>
  );
};

const Steps = () => {
  const { t, list } = useSite();
  return (
    <Section id="como-funciona">
      <Container>
        <h2 className={H2}>{t('steps.title')}</h2>
        <p className={SUB}>{t('steps.sub')}</p>
        <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7 p-0">
          {list<Titled>('steps.items').map((step, index) => (
            <li key={step.title} className="pt-2">
              <span aria-hidden="true" className="mb-[14px] inline-flex size-[38px] items-center justify-center rounded-full bg-[var(--accent-secondary)] font-['Jost',sans-serif] font-bold text-[var(--text-heading)]">{index + 1}</span>
              <h3 className={H3}>{step.title}</h3><p className="m-0 text-[.94rem]">{step.text}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
};

const PatientApp = () => {
  const { t, list } = useSite();
  return (
    <Section tone="dark">
      <Container className="grid items-center gap-10 min-[901px]:grid-cols-2 min-[901px]:gap-14">
        <div>
          <p className={`${BADGE} m-0 bg-white/15 text-white`}><Smartphone size={13} /> {t('app.badge')}</p>
          <h2 className={`${H2} mt-[14px] text-left`}>{t('app.title')}</h2>
          <p className="m-0 max-w-[64ch] text-left text-base text-white/80">{t('app.sub')}</p>
          <CheckList items={list<string>('app.list')} accent />
        </div>
        <div aria-hidden="true" className="flex justify-center">
          <div className="grid w-[250px] gap-[10px] rounded-[30px] bg-white px-[18px] pb-[22px] pt-[26px] shadow-[0_24px_60px_rgba(0,0,0,.22)]">
            <span className="mx-auto mb-2 h-[5px] w-[58px] rounded-full bg-[#D9E3F0]" />
            {list<string>('app.phone').map((row, index) => {
              const Icon = PHONE_ICONS[index] ?? Activity;
              const accent = index === 2;
              return (
                <div key={row} className={`flex items-center gap-[9px] rounded-xl px-[14px] py-3 text-[.82rem] text-[#0F2A47] ${accent ? 'bg-[#FFF4D1]' : 'bg-[#F2F7FF]'}`}>
                  <Icon size={16} className={`shrink-0 ${accent ? 'text-[#9A6B00]' : 'text-[#1D6FD1]'}`} /> {row}
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
};

const Plans = () => {
  const { t, lang } = useSite();
  const { publicPlans: plans, error } = useAppSelector((state) => state.planOrder);
  const failed = plans === null && Boolean(error);
  const highlightIndex = plans && plans.length >= 3 ? Math.floor(plans.length / 2) : -1;
  const period = (days: number) => (days === 30 ? t('plans.period_month') : days === 365 ? t('plans.period_year') : t('plans.period_days', { count: days }));
  return (
    <Section id="planos">
      <Container>
        <h2 className={H2}>{t('plans.title')}</h2>
        <p className={SUB}>{t('plans.sub')}</p>
        {failed && <p role="alert" className={SUB}>{t('plans.unavailable')}</p>}
        <div className={`${GRID} items-stretch`}>
          {(plans ?? []).map((plan, index) => {
            const highlight = index === highlightIndex;
            const features = [
              t('plans.users', { count: plan.availableUsers }),
              t('plans.aiQuota', { count: plan.dailyAiQuota }),
              ...(plan.tiers.length ? [t('plans.tiers')] : []),
            ];
            return (
              <article key={plan.uuid} className={`${CARD} relative px-7 py-8 ${highlight ? 'border-[var(--accent-primary)] shadow-[0_16px_40px_rgba(29,111,209,.12)]' : ''}`}>
                {highlight && <span className="absolute -top-[13px] left-7 rounded-full bg-[var(--accent-secondary)] px-[13px] py-[5px] text-[.68rem] font-bold uppercase tracking-[.09em] text-[var(--text-heading)]">{t('plans.flag')}</span>}
                <h3 className={H3}>{plan.name}</h3>
                <p className={`${HEADING} m-0 mt-[18px] flex items-baseline gap-1 text-[2.9rem] font-medium leading-none`}>
                  {formatPrice(plan.priceInCents, lang)}
                  <span className="font-normal text-[.95rem] text-[var(--text-body)]">{period(plan.periodDays)}</span>
                </p>
                <CheckList items={features} />
                <Link
                  to={`/contratar/${plan.uuid}`}
                  className={`${BTN} mt-auto w-full whitespace-normal text-center ${highlight ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]' : 'bg-[var(--accent-secondary)] text-[var(--text-heading)] hover:bg-[var(--accent-secondary-hover)]'}`}
                >{t('plans.start', { name: plan.name })}</Link>
              </article>
            );
          })}
        </div>
      </Container>
    </Section>
  );
};

const FaqSection = () => {
  const { t, list } = useSite();
  return (
    <Section id="duvidas">
      <Container className="max-w-[868px]">
        <h2 className={H2}>{t('faq.title')}</h2>
        <div className="mt-[34px] grid gap-3">
          {list<Faq>('faq.items').map((item) => (
            <details key={item.q} className="rounded-[14px] border border-[var(--border-color)] bg-[var(--bg-alt)] px-[22px] py-1 open:border-[var(--accent-primary)]">
              <summary className="cursor-pointer py-[18px] font-medium text-[var(--text-heading)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-secondary)]">{item.q}</summary>
              <p className="m-0 pb-[18px] text-[.95rem]">{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
};

const FinalCta = () => {
  const { t } = useSite();
  return (
    <section className="bg-[var(--bg-primary)] py-[52px] text-center min-[561px]:py-[76px]">
      <Container>
        <h2 className={H2}>{t('cta.title')}</h2>
        <p className="mx-auto mb-[26px] mt-0 max-w-[52ch]">{t('cta.text')}</p>
        <Link to="/login" className={`${BTN_PRIMARY} ${BTN_LG}`}>{t('access')} <ArrowRight size={18} /></Link>
      </Container>
    </section>
  );
};

const FOOTER_LINK = 'text-[var(--text-heading)] no-underline hover:text-[var(--accent-primary)]';
const FOOTER_TITLE = 'mb-[14px] mt-0 text-[.74rem] font-medium uppercase tracking-[.13em] text-[var(--text-body)]';

const Footer = () => {
  const { t } = useSite();
  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-alt)] pb-[26px] pt-14 text-[.9rem]">
      <Container className="grid gap-7 min-[561px]:grid-cols-2 min-[901px]:grid-cols-[1.6fr_repeat(3,1fr)] min-[901px]:gap-9">
        <div className="text-[var(--text-heading)]">
          <Logo size={32} />
          <p className="mb-0 mt-[14px] max-w-[34ch] text-[var(--text-body)]">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.product')} className="flex flex-col items-start gap-[9px]">
          <h2 className={FOOTER_TITLE}>{t('footer.product')}</h2>
          <a href="#funcionalidades" className={FOOTER_LINK}>{t('nav.features')}</a>
          <a href="#planos" className={FOOTER_LINK}>{t('nav.plans')}</a>
          <a href="#duvidas" className={FOOTER_LINK}>{t('footer.faq')}</a>
        </nav>
        <nav aria-label={t('footer.access')} className="flex flex-col items-start gap-[9px]">
          <h2 className={FOOTER_TITLE}>{t('footer.access')}</h2>
          <Link to="/login" className={FOOTER_LINK}>{t('access')}</Link>
        </nav>
        <nav aria-label={t('footer.legal')} className="flex flex-col items-start gap-[9px]">
          <h2 className={FOOTER_TITLE}>{t('footer.legal')}</h2>
          <a href="/termos-de-uso" className={FOOTER_LINK}>{t('footer.terms')}</a>
          <a href="/politica-de-privacidade" className={FOOTER_LINK}>{t('footer.privacy')}</a>
        </nav>
      </Container>
      <Container className="mt-10 border-t border-[var(--border-color)] pt-5 text-[.82rem]">
        <p className="m-0">© {new Date().getFullYear()} NutriRev · nutrirev.com.br</p>
      </Container>
    </footer>
  );
};

export const LandingPage = () => {
  const { t } = useSite();
  const dispatch = useAppDispatch();
  const loaded = useAppSelector((state) => state.planOrder.publicPlans !== null);
  useEffect(() => { if (!loaded) dispatch(fetchPublicPlans()); }, [dispatch, loaded]);
  const title = `NutriRev — ${t('hero.badge')}`;
  useEffect(() => { document.title = title; }, [title]);
  return (
    <div className="bg-[var(--bg-alt)] text-[var(--text-body)]">
      <StructuredData />
      <Header />
      <main>
        <Hero /><Audiences /><Features /><Steps /><PatientApp /><Plans /><FaqSection /><FinalCta />
      </main>
      <Footer />
    </div>
  );
};
