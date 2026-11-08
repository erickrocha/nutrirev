import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Flame, Layers, Pill, Sparkles, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import { LIPID_OTHER_FIELDS, MACRO_FIELDS, MINERAL_FIELDS, VITAMIN_FIELDS, unitOf, type NutrientField } from '../../config/ingredientFields';
import { formatNutrient } from '../../utils/ingredientForm';
import type { Ingredient } from '../../types/ingredient';

interface Props {
  ingredient: Ingredient;
  displayName: string;
  editTo?: string;
  onClose: () => void;
}

// A aba "lipídios e outros" mostra o TACO no cabeçalho, não como estatística.
const LIPID_STATS = LIPID_OTHER_FIELDS.filter((field) => field !== 'tacoId');
// Os macros aparecem seguidos do kJ, como na tela anterior.
const MACRO_STATS: readonly NutrientField[] = [...MACRO_FIELDS, 'kj'];

export const IngredientDetailsModal = ({ ingredient, displayName, editTo, onClose }: Props) => {
  const { t } = useTranslation();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const section = (icon: React.ReactNode, title: string, fields: readonly NutrientField[]) => (
    <section className="mb-5">
      <h4 className="mb-2 mt-0 flex items-center gap-2 text-[.95rem] text-[var(--accent-primary)]">{icon}{title}</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fields.map((field) => (
          <div key={field} className="flex flex-col rounded-lg border border-[var(--border-color)] bg-slate-50 p-2">
            <span className="text-[.75rem] text-[var(--text-body)]">{t(`ingredients.${field}`)}</span>
            <strong className="text-[.95rem]">{formatNutrient(ingredient[field], unitOf(field))}</strong>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div
      role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-0 sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="ingredient-details-title" className="flex max-h-screen w-full flex-col overflow-y-auto bg-white p-6 sm:max-h-[calc(100vh-40px)] sm:max-w-[900px] sm:rounded-2xl">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="ingredient-details-title" className="m-0 text-[1.2rem] text-[var(--text-heading)]">{displayName}</h3>
            <small className="text-[var(--text-body)]">{ingredient.tacoId ? `TACO #${ingredient.tacoId} — ` : ''}{t('ingredients.per100g')}</small>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <div>
            {section(<Flame size={16} />, t('ingredients.tabMacros'), MACRO_STATS)}
            {section(<Layers size={16} />, t('ingredients.tabLipidsOther'), LIPID_STATS)}
          </div>
          <div>
            {section(<Sparkles size={16} />, t('ingredients.tabMinerals'), MINERAL_FIELDS)}
            {section(<Pill size={16} />, t('ingredients.tabVitamins'), VITAMIN_FIELDS)}
          </div>
        </div>
        <footer className="mt-auto flex items-center justify-between gap-3 border-t border-[var(--border-color)] pt-4">
          <Button variant="outline" onClick={onClose}>{t('common.close')}</Button>
          {editTo && <Button to={editTo}><Edit2 size={16} />{t('common.edit')}</Button>}
        </footer>
      </div>
    </div>
  );
};
