import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BarChart3, CalendarClock, CheckCircle2, ClipboardList,
  CreditCard, LineChart, Salad, ScanLine, Smartphone, Sparkles, Target, Users,
} from 'lucide-react';
import { Logo } from '../../components/brand/Logo';

// ponytail: preço vive aqui, não numa chamada de API. É copy de marketing que muda
// duas vezes por ano, precisa estar no HTML inicial pro Google indexar e não pode ter
// estado de loading na seção que vende. Valores espelham a tabela `business_plan`.
// Se virar preço dinâmico/campanha, expor GET público e trocar só esta constante.
const PLANS = [
  {
    name: 'Entrada',
    price: '97',
    tagline: 'Para o nutricionista que atende sozinho.',
    features: ['Até 10 usuários', '4 análises de IA por dia', 'App do paciente incluído', 'Planos alimentares e receitas'],
  },
  {
    name: 'Profissional',
    price: '249',
    tagline: 'Para a clínica com equipe e agenda cheia.',
    highlight: true,
    features: ['Até 15 usuários', '6 análises de IA por dia', 'Cobrança recorrente e PIX', 'Dashboard da clínica'],
  },
  {
    name: 'Clínica & Franquia',
    price: '890',
    tagline: 'Para redes com mais de uma unidade.',
    features: ['Até 50 usuários', '10 análises de IA por dia', 'Múltiplas clínicas na mesma conta', 'Faixas de preço por volume de usuários'],
  },
];

const FEATURES = [
  { icon: ClipboardList, title: 'Ficha clínica completa', text: 'Condições pré-existentes, restrições alimentares, função intestinal e histórico do paciente em um só lugar.' },
  { icon: Target, title: 'Metas e cálculo energético', text: 'Fórmulas, fator de atividade e objetivo aplicados automaticamente ao definir a meta de cada paciente.' },
  { icon: Salad, title: 'Planos alimentares e receitas', text: 'Monte o plano com base de ingredientes TACO, reaproveite receitas e entregue direto no app do paciente.' },
  { icon: ScanLine, title: 'Análise de refeição por IA', text: 'O paciente fotografa o prato e recebe a leitura dos macros. Você revisa o que chegou, sem transcrever nada.' },
  { icon: Activity, title: 'Diário alimentar e adesão', text: 'Acompanhe o que foi registrado dia a dia e veja quem está seguindo o plano antes da próxima consulta.' },
  { icon: LineChart, title: 'Evolução do paciente', text: 'Medições e análise corporal ao longo do tempo, para mostrar resultado com dado e não com impressão.' },
  { icon: CreditCard, title: 'Cobrança recorrente', text: 'Datas de pagamento, PIX e cartão. A mensalidade do paciente deixa de depender de você lembrar.' },
  { icon: Users, title: 'Equipe e permissões', text: 'Nutricionistas, médicos e recepção com acesso ao que lhes cabe — cada perfil vê apenas o seu escopo.' },
  { icon: BarChart3, title: 'Dashboard da clínica', text: 'Pacientes ativos, planos em andamento e pagamentos em aberto na primeira tela do dia.' },
];

const AUDIENCES = [
  { title: 'Nutricionista autônomo', text: 'Sai da planilha e do PDF por WhatsApp sem contratar um sistema de clínica grande.' },
  { title: 'Clínica de nutrição', text: 'Equipe, agenda de cobrança e prontuário compartilhado, com cada profissional no seu escopo.' },
  { title: 'Rede e franquia', text: 'Várias unidades na mesma conta, cada uma com sua identidade visual e seus dados isolados.' },
];

const STEPS = [
  { title: 'Cadastre a clínica e a equipe', text: 'Você entra, cria os usuários e define quem acessa o quê. Sem implantação, sem consultoria.' },
  { title: 'Monte o plano do paciente', text: 'Ficha clínica, meta calculada e plano alimentar. O paciente recebe o acesso ao app na hora.' },
  { title: 'Acompanhe e cobre', text: 'O diário chega sozinho, a evolução fica registrada e a mensalidade é cobrada na data combinada.' },
];

const FAQ = [
  { q: 'A NutriRev serve para nutricionista que atende sozinho?', a: 'Serve. O plano Entrada cobre até 10 usuários e já inclui plano alimentar, diário do paciente e o app — é o mesmo produto que a clínica grande usa, na escala de um consultório.' },
  { q: 'O paciente precisa instalar algum aplicativo?', a: 'O paciente usa o app da NutriRev para registrar refeições, ver o plano alimentar e acompanhar a evolução. O acesso é criado por você no momento do cadastro, sem custo extra por paciente.' },
  { q: 'Como funciona a análise de refeição por inteligência artificial?', a: 'O paciente fotografa o prato e a IA identifica os alimentos e estima os macronutrientes. Cada plano tem uma cota diária de análises por paciente. O registro fica no diário para você revisar antes da consulta.' },
  { q: 'Consigo cobrar meus pacientes pela plataforma?', a: 'Sim. Você define a data de pagamento de cada paciente e a cobrança é gerada de forma recorrente, com PIX e cartão.' },
  { q: 'Os dados dos meus pacientes ficam seguros?', a: 'Cada clínica tem os dados isolados das demais, o acesso é controlado por perfil e todo acesso a dado clínico é registrado. O tratamento de dados segue a LGPD e está descrito na Política de Privacidade.' },
  { q: 'Posso trocar de plano depois?', a: 'Pode, a qualquer momento. O plano define quantos usuários e quantas análises de IA por dia a clínica tem — se a equipe cresce, você sobe de faixa sem perder histórico.' },
];

const SITE_URL = 'https://nutrirev.com.br';

// JSON-LD gerado a partir das mesmas constantes que a página renderiza — preço e FAQ
// têm uma fonte só. O Google executa JS, então o schema injetado aqui é lido.
const StructuredData = () => {
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
        inLanguage: 'pt-BR',
        description: 'Plataforma de gestão para clínicas e consultórios de nutrição: ficha clínica, plano alimentar, diário do paciente com análise por IA, app mobile e cobrança recorrente.',
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: PLANS.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: plan.price,
          priceCurrency: 'BRL',
          url: `${SITE_URL}/#planos`,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map((item) => ({
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

const Header = () => (
  <header className="lp-header">
    <div className="container lp-header-inner">
      <Link to="/" className="lp-brand" aria-label="NutriRev, página inicial">
        <Logo />
      </Link>
      <nav className="lp-nav" aria-label="Navegação principal">
        <a href="#funcionalidades">Funcionalidades</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#planos">Planos</a>
        <a href="#duvidas">Dúvidas</a>
      </nav>
      <Link to="/login" className="lp-btn lp-btn-primary lp-header-cta">
        Acessar sistema <ArrowRight size={17} />
      </Link>
    </div>
  </header>
);

const Hero = () => (
  <section className="lp-hero">
    <div className="container lp-hero-inner">
      <p className="lp-badge"><Sparkles size={13} /> Gestão de clínicas de nutrição</p>
      <h1>
        O sistema que organiza sua clínica de nutrição <span>do prontuário à mensalidade</span>
      </h1>
      <p className="lp-hero-sub">
        Ficha clínica, plano alimentar, diário do paciente com análise por IA, app mobile e
        cobrança recorrente. Tudo em uma plataforma só, sem implantação.
      </p>
      <div className="lp-hero-actions">
        <a href="#planos" className="lp-btn lp-btn-primary lp-btn-lg">
          Ver planos e preços <ArrowRight size={18} />
        </a>
        <Link to="/login" className="lp-btn lp-btn-outline lp-btn-lg">Acessar sistema</Link>
      </div>
      <ul className="lp-hero-strip">
        <li><CheckCircle2 size={16} /> App do paciente incluído</li>
        <li><CheckCircle2 size={16} /> Cobrança por PIX e cartão</li>
        <li><CheckCircle2 size={16} /> A partir de R$ 97/mês</li>
      </ul>
    </div>
  </section>
);

const Audiences = () => (
  <section className="lp-section" id="para-quem">
    <div className="container">
      <h2>Feito para quem atende nutrição</h2>
      <p className="lp-section-sub">Do consultório de uma sala à rede com várias unidades.</p>
      <div className="lp-grid lp-grid-3">
        {AUDIENCES.map((item) => (
          <article className="lp-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Features = () => (
  <section className="lp-section lp-section-alt" id="funcionalidades">
    <div className="container">
      <h2>Tudo que a clínica usa no dia, em um lugar</h2>
      <p className="lp-section-sub">
        Sem alternar entre planilha, aplicativo de mensagem e caderno de cobrança.
      </p>
      <div className="lp-grid lp-grid-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article className="lp-card lp-feature" key={title}>
            <span className="lp-icon" aria-hidden="true"><Icon size={20} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Steps = () => (
  <section className="lp-section" id="como-funciona">
    <div className="container">
      <h2>Como funciona</h2>
      <p className="lp-section-sub">Três passos entre criar a conta e acompanhar o primeiro paciente.</p>
      <ol className="lp-steps">
        {STEPS.map((step, index) => (
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

const PatientApp = () => (
  <section className="lp-section lp-section-dark">
    <div className="container lp-split">
      <div>
        <p className="lp-badge lp-badge-onDark"><Smartphone size={13} /> App do paciente</p>
        <h2>O acompanhamento continua fora da consulta</h2>
        <p className="lp-section-sub">
          O paciente registra a refeição pela foto, consulta o plano alimentar e vê a própria
          evolução. Você chega na consulta seguinte já sabendo o que aconteceu no intervalo.
        </p>
        <ul className="lp-check-list">
          <li><CheckCircle2 size={17} /> Plano alimentar sempre atualizado no celular</li>
          <li><CheckCircle2 size={17} /> Registro de refeição por foto, com leitura dos macros</li>
          <li><CheckCircle2 size={17} /> Histórico de medições e evolução</li>
          <li><CheckCircle2 size={17} /> Mensalidade e comprovantes na própria conta</li>
        </ul>
      </div>
      <div className="lp-split-visual" aria-hidden="true">
        <div className="lp-phone">
          <span className="lp-phone-notch" />
          <div className="lp-phone-row"><CalendarClock size={16} /> Café da manhã · 412 kcal</div>
          <div className="lp-phone-row"><ScanLine size={16} /> Almoço analisado por IA</div>
          <div className="lp-phone-row lp-phone-row-accent"><Activity size={16} /> Meta do dia: 78%</div>
          <div className="lp-phone-row"><LineChart size={16} /> −3,2 kg em 8 semanas</div>
        </div>
      </div>
    </div>
  </section>
);

const Plans = () => (
  <section className="lp-section" id="planos">
    <div className="container">
      <h2>Planos e preços</h2>
      <p className="lp-section-sub">
        Preço por clínica, não por paciente. Sem taxa de implantação e sem fidelidade.
      </p>
      <div className="lp-grid lp-grid-3 lp-plans">
        {PLANS.map((plan) => (
          <article className={`lp-card lp-plan${plan.highlight ? ' is-highlight' : ''}`} key={plan.name}>
            {plan.highlight && <span className="lp-plan-flag">Mais escolhido</span>}
            <h3>{plan.name}</h3>
            <p className="lp-plan-tagline">{plan.tagline}</p>
            <p className="lp-plan-price">
              <span className="lp-plan-currency">R$</span>
              {plan.price}
              <span className="lp-plan-period">/mês</span>
            </p>
            <ul className="lp-check-list">
              {plan.features.map((feature) => (
                <li key={feature}><CheckCircle2 size={17} /> {feature}</li>
              ))}
            </ul>
            <Link to="/login" className={`lp-btn ${plan.highlight ? 'lp-btn-primary' : 'lp-btn-outline'} lp-btn-block`}>
              Começar com o {plan.name}
            </Link>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const Faq = () => (
  <section className="lp-section" id="duvidas">
    <div className="container lp-faq-wrap">
      <h2>Dúvidas frequentes</h2>
      <div className="lp-faq">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const FinalCta = () => (
  <section className="lp-cta">
    <div className="container">
      <h2>Comece a atender pela NutriRev</h2>
      <p>Crie a conta da sua clínica e cadastre o primeiro paciente hoje.</p>
      <Link to="/login" className="lp-btn lp-btn-primary lp-btn-lg">
        Acessar sistema <ArrowRight size={18} />
      </Link>
    </div>
  </section>
);

const Footer = () => (
  <footer className="lp-footer">
    <div className="container lp-footer-inner">
      <div className="lp-footer-brand">
        <Logo size={32} />
        <p>Plataforma de gestão para clínicas e consultórios de nutrição.</p>
      </div>
      <nav aria-label="Produto">
        <h2>Produto</h2>
        <a href="#funcionalidades">Funcionalidades</a>
        <a href="#planos">Planos</a>
        <a href="#duvidas">Dúvidas frequentes</a>
      </nav>
      <nav aria-label="Acesso">
        <h2>Acesso</h2>
        <Link to="/login">Acessar sistema</Link>
      </nav>
      <nav aria-label="Legal">
        <h2>Legal</h2>
        <a href="/termos-de-uso">Termos de uso</a>
        <a href="/politica-de-privacidade">Política de privacidade</a>
      </nav>
    </div>
    <div className="container lp-footer-bottom">
      <p>© {new Date().getFullYear()} NutriRev · nutrirev.com.br</p>
    </div>
  </footer>
);

export const LandingPage = () => (
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
