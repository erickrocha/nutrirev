/**
 * Marca NutriRev: anel azul (herda `currentColor`, para funcionar sobre branco e sobre azul)
 * com um arco amarelo de acento.
 */
export const LogoMark = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g transform="rotate(-90 50 50)" fill="none" strokeLinecap="round" strokeWidth="13">
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeDasharray="160 79" />
      <circle cx="50" cy="50" r="38" stroke="var(--accent-secondary)" strokeDasharray="60 179" strokeDashoffset="-170" />
    </g>
  </svg>
);

interface LogoProps { size?: number; className?: string; /** Sobre fundo azul, "rev" vira amarelo (azul sobre azul não lê). */ onDark?: boolean }

export const Logo = ({ size = 36, className = '', onDark = false }: LogoProps) => (
  <span className={`inline-flex items-center gap-[10px] ${className}`.trim()}>
    <LogoMark size={size} />
    <span className={`font-['Jost',sans-serif] font-light leading-none tracking-[-.01em] ${size >= 44 ? 'text-[1.9rem]' : 'text-[1.6rem]'} ${onDark ? '[&_b]:text-[var(--accent-secondary)]' : '[&_b]:text-[var(--accent-primary)]'} [&_b]:font-bold`}>Nutri<b>rev</b></span>
  </span>
);
