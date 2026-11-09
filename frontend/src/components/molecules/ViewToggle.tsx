import type { ComponentType } from 'react';

export interface ViewOption<T extends string> {
  id: T;
  label: string;
  title: string;
  icon: ComponentType<{ size?: number }>;
}

interface Props<T extends string> {
  value: T;
  options: Array<ViewOption<T>>;
  onChange: (value: T) => void;
}

export const ViewToggle = <T extends string>({ value, options, onChange }: Props<T>) => (
  <div role="group" className="flex gap-1 rounded-xl border border-[var(--border-color)] bg-slate-100 p-1">
    {options.map(({ id, label, title, icon: Icon }) => (
      <button
        key={id} type="button" title={title} aria-pressed={value === id} onClick={() => onChange(id)}
        className={`flex items-center gap-[6px] rounded-lg px-4 py-2 text-[.85rem] font-semibold hover:text-[var(--text-heading)] ${value === id ? 'bg-white text-[var(--text-heading)] shadow-sm' : 'text-slate-500'}`}
      >
        <Icon size={16} />{label}
      </button>
    ))}
  </div>
);
