import type { Lang } from './format';

export interface IngredientLike {
  id: number;
  name: string;
  nameEn?: string | null;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

// Nome do ingrediente no idioma da interface (name = PT, nameEn = EN).
export const ingredientName = (item: IngredientLike | null | undefined, lang: Lang): string | undefined =>
  lang === 'en' && item?.nameEn ? item.nameEn : item?.name;

// Opções do seletor: o item já escolhido (do cache) + resultado da busca atual, sem repetir.
export const ingredientPickerOptions = (
  selectedId: number | string | null | undefined,
  cache: IngredientLike[],
  results: IngredientLike[],
  lang: Lang,
  describe: (item: IngredientLike, name: string) => string,
): { id: number; name: string }[] => {
  const selected = selectedId ? cache.find((item) => item.id === Number(selectedId)) : undefined;
  const list = selected ? [selected, ...results.filter((item) => item.id !== selected.id)] : results;
  return list.map((item) => ({ id: item.id, name: describe(item, ingredientName(item, lang) ?? '') }));
};
