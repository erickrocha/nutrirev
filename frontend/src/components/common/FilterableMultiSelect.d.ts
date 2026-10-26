import type { ComponentType } from 'react';

export interface SelectOption {
  id: string | number;
  name: string;
}

export interface FilterableMultiSelectProps {
  label?: string;
  icon?: ComponentType<{ size?: number; style?: object }>;
  iconColor?: string;
  options?: SelectOption[];
  selectedIds?: Array<string | number>;
  onChange: (ids: any[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  isSingleSelect?: boolean;
  showSearch?: boolean;
  disabled?: boolean;
  isClearable?: boolean;
}

export const FilterableMultiSelect: ComponentType<FilterableMultiSelectProps>;
