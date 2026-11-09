import type { ReactNode } from 'react';

export const Container = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-[1200px] px-6 ${className}`.trim()}>{children}</div>
);
