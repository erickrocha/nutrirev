import React from 'react';

/**
 * Marca NutriRev: anel azul (herda `currentColor`, para funcionar sobre branco
 * e sobre azul) com um arco amarelo de acento.
 */
export const LogoMark = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g transform="rotate(-90 50 50)" fill="none" strokeLinecap="round" strokeWidth="13">
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeDasharray="160 79" />
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke="var(--accent-secondary)"
        strokeDasharray="60 179"
        strokeDashoffset="-170"
      />
    </g>
  </svg>
);

export const Logo = ({ size = 36, className = '' }) => (
  <span className={`brand-lockup ${className}`.trim()}>
    <LogoMark size={size} />
    <span className="brand-wordmark">
      Nutri<b>rev</b>
    </span>
  </span>
);
