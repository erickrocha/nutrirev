import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export const Breadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav aria-label="breadcrumb" className="mb-4 flex items-center gap-2 text-[.85rem] text-[var(--text-body)]">
    {items.map((item, index) => (
      <span key={`${item.label}-${index}`} className="flex items-center gap-2">
        {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
        {item.to ? (
          <Link to={item.to} className="font-semibold text-[var(--accent-primary)] no-underline">{item.label}</Link>
        ) : (
          <span aria-current="page">{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);
