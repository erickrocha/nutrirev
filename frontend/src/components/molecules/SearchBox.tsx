import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export const SearchBox = ({ value, onChange, placeholder }: Props) => (
  <div className="relative mb-5">
    <Search size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)}
      className="box-border w-full rounded-lg border border-[var(--border-color)] bg-white py-[10px] pl-[38px] pr-3 hover:border-[var(--accent-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
    />
  </div>
);
