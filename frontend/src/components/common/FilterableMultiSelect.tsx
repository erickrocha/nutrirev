import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Id = string | number;
export interface SelectOption<T extends Id = Id> { id: T; name: string }

export interface FilterableMultiSelectProps<T extends Id = Id> {
  label?: string;
  icon?: ComponentType<{ size?: number; className?: string; style?: CSSProperties }>;
  iconColor?: string;
  options?: Array<SelectOption<T>>;
  selectedIds?: T[];
  onChange: (ids: T[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  isSingleSelect?: boolean;
  showSearch?: boolean;
  disabled?: boolean;
  isClearable?: boolean;
  /** Com `onSearch` a busca é feita fora (servidor): as opções já chegam filtradas. */
  onSearch?: ((text: string) => void) | null;
}

const SEARCH_DELAY_MS = 300;
const PANEL_HEIGHT = 260;
const same = (a: Id, b: Id) => String(a) === String(b);

export const FilterableMultiSelect = <T extends Id = Id>({
  label, icon: Icon, iconColor, options = [], selectedIds = [], onChange, placeholder, emptyMessage,
  isSingleSelect = false, showSearch = true, disabled = false, isClearable = true, onSearch = null,
}: FilterableMultiSelectProps<T>) => {
  const { t } = useTranslation();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [position, setPosition] = useState<CSSProperties>({});
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // `onSearch` costuma ser recriada a cada render; a busca só depende do texto digitado.
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // O painel flutua (portal) para não ser cortado por modais e áreas com rolagem.
  const reposition = useCallback(() => {
    if (!trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const opensUp = window.innerHeight - rect.bottom < PANEL_HEIGHT && rect.top > PANEL_HEIGHT;
    setPosition({
      position: 'fixed', left: rect.left, width: rect.width, zIndex: 999_999,
      top: opensUp ? Math.max(10, rect.top - PANEL_HEIGHT - 4) : rect.bottom + 4,
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    reposition();
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!container.current?.contains(target) && !panel.current?.contains(target)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!onSearchRef.current || !open) return undefined;
    const timer = setTimeout(() => onSearchRef.current?.(filter.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filter, open]);

  const isSelected = useCallback((id: T) => selectedIds.some((selected) => same(selected, id)), [selectedIds]);
  const visible = useMemo(
    () => (onSearch ? options : options.filter((option) => (option.name || '').toLowerCase().includes(filter.toLowerCase()))),
    [onSearch, options, filter],
  );
  const selectedOptions = options.filter((option) => isSelected(option.id));

  const toggle = (id: T) => {
    if (isSingleSelect) {
      onChange(isSelected(id) ? [] : [id]);
      setOpen(false);
    } else {
      onChange(isSelected(id) ? selectedIds.filter((item) => !same(item, id)) : [...selectedIds, id]);
    }
  };

  const summary = selectedIds.length === 0
    ? placeholder ?? t('select.placeholder')
    : isSingleSelect ? selectedOptions[0]?.name || placeholder || t('select.placeholder') : t('select.itemsSelected', { count: selectedIds.length });

  return (
    <div ref={container} className={`box-border w-full rounded-lg border border-[var(--border-color)] bg-[#FAF9F6] px-3 py-[10px] ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {label && (
        <div className="mb-[6px] flex items-center justify-between">
          <span className="flex items-center gap-[6px] text-[.85rem] font-semibold text-[var(--text-heading)]">
            {Icon && <Icon size={14} style={{ color: iconColor }} />}<span>{label}</span>
          </span>
          {!isSingleSelect && selectedIds.length > 0 && (
            <span className="rounded-xl bg-[var(--badge-bg)] px-2 py-[2px] text-[.75rem] font-semibold text-[var(--accent-primary)]">{t('select.selectedCount', { count: selectedIds.length })}</span>
          )}
        </div>
      )}

      {!isSingleSelect && selectedOptions.length > 0 && (
        <div className="mb-2 flex max-h-20 flex-wrap gap-[6px] overflow-y-auto p-[2px]">
          {selectedOptions.map((option) => (
            <span key={option.id} className="inline-flex items-center gap-1 rounded-[14px] border border-[var(--border-color)] bg-white py-[3px] pl-[10px] pr-2 text-[.78rem] font-medium text-[var(--text-heading)] shadow-sm">
              {option.name}
              <button type="button" title={t('select.remove')} aria-label={`${t('select.remove')} ${option.name}`} onClick={(event) => { event.stopPropagation(); onChange(selectedIds.filter((item) => !same(item, option.id))); }} className="flex rounded-full text-[var(--text-body)] hover:text-red-600"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}

      <div className={`box-border flex w-full items-center justify-between rounded-md border bg-white px-[10px] py-2 ${open ? 'border-[var(--accent-primary)] shadow-[0_0_0_2px_rgba(29,111,209,.15)]' : 'border-[var(--border-color)]'}`}>
        <button
          ref={trigger} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={label}
          onClick={() => setOpen((current) => !current)}
          className={`min-w-0 flex-1 select-none overflow-hidden text-ellipsis whitespace-nowrap bg-transparent text-left text-[.85rem] ${selectedIds.length > 0 ? 'text-[var(--text-heading)]' : 'text-[#888]'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >{summary}</button>
        <span className="flex items-center gap-[6px]">
          {isClearable && selectedIds.length > 0 && !disabled && (
            <button type="button" title={t('select.clearSelection')} aria-label={t('select.clearSelection')} onClick={() => onChange([])} className="flex text-[var(--text-body)] hover:text-red-600"><X size={14} /></button>
          )}
          <ChevronDown size={16} className={`shrink-0 text-[var(--text-body)] transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </div>

      {open && !disabled && createPortal(
        <div ref={panel} style={position} className="box-border flex max-h-[260px] flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-white shadow-xl">
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-3 py-2">
              <Search size={15} className="shrink-0 text-[var(--text-body)]" />
              <input
                type="text" autoFocus value={filter} placeholder={t('select.search')} aria-label={t('select.search')} onChange={(event) => setFilter(event.target.value)}
                className="w-full border-0 bg-transparent text-[.85rem] outline-none"
              />
              {filter && <button type="button" aria-label={t('select.clearSearch')} onClick={() => setFilter('')} className="flex text-[var(--text-body)]"><X size={14} /></button>}
            </div>
          )}
          {!isSingleSelect && (
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-[6px] text-[.75rem]">
              <span className="text-[#888]">{t('select.optionsCount', { shown: visible.length, total: options.length })}</span>
              <span className="flex gap-[10px]">
                <button type="button" onClick={() => onChange(options.map((option) => option.id))} className="font-semibold text-[var(--accent-primary)] hover:underline">{t('select.selectAll')}</button>
                <span className="text-[var(--text-body)]">|</span>
                <button type="button" onClick={() => onChange([])} className="font-semibold text-[var(--text-body)] hover:underline">{t('select.clearAll')}</button>
              </span>
            </div>
          )}
          <div id={listId} role="listbox" aria-multiselectable={!isSingleSelect} className="overflow-y-auto">
            {visible.length === 0 ? (
              <div className="p-4 text-center text-[.85rem] text-[var(--text-body)]">{emptyMessage ?? t('select.noOptions')}</div>
            ) : visible.map((option) => {
              const selected = isSelected(option.id);
              return (
                <div
                  key={option.id} role="option" aria-selected={selected} tabIndex={0}
                  onClick={() => toggle(option.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(option.id); } }}
                  className={`flex cursor-pointer items-center gap-[10px] px-3 py-2 text-[.85rem] hover:bg-[var(--bg-primary)] ${selected ? 'bg-[#FDFBF7] font-semibold' : ''}`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center border ${isSingleSelect ? 'rounded-full' : 'rounded'} ${selected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' : 'border-[var(--border-color)]'}`}>{selected && <Check size={12} className="text-white" />}</span>
                  <span className="min-w-0 flex-1">{option.name}</span>
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
