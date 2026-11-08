import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { Image, Loader2, Plus, Save, Trash2, Upload, Utensils, X } from 'lucide-react';
import { Breadcrumb } from '../../components/molecules/Breadcrumb';
import { ErrorAlert } from '../../components/molecules/ErrorAlert';
import { SectionCard } from '../../components/molecules/SectionCard';
import { Button } from '../../components/atoms/Button';
import { SelectField } from '../../components/atoms/SelectField';
import { TextField } from '../../components/atoms/TextField';
import { IngredientLineFields } from '../../components/organisms/IngredientLineFields';
import { clearRecipeError, fetchRecipeById, saveRecipe } from '../../store/recipeSlice';
import { fetchCycles, fetchIngredients, fetchIngredientsByIds } from '../../store/ingredientSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { PATHS } from '../../router/routeConfig';
import { ENUM_VALUES, enumLabel } from '../../utils/enums';
import { newItem } from '../../utils/mealPlanForm';
import { emptyRecipeForm, hasUnselectedIngredient, recipeToForm, toRecipePayload, type RecipeFormValues } from '../../utils/recipeForm';
import type { PhotoPayload, Recipe } from '../../types/recipe';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface FormProps {
  defaults: RecipeFormValues;
  existing?: Recipe;
  lang: 'pt' | 'en';
  onSubmit: (values: RecipeFormValues, photo: PhotoPayload | null) => void;
}

// O formulário só monta com os dados prontos: assim os valores iniciais nunca sobrescrevem o que o usuário digitou.
const RecipeForm = ({ defaults, existing, lang, onSubmit }: FormProps) => {
  const { t } = useTranslation();
  const { saving, error } = useAppSelector((state) => state.recipe);
  const ingredientOptions = useAppSelector((state) => state.ingredient.ingredientOptions);
  const [photoPreview, setPhotoPreview] = useState(existing?.photo ?? '');
  const [photo, setPhoto] = useState<PhotoPayload | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const schema = useMemo(() => yup.object({ name: yup.string().trim().required(t('recipeAdmin.nameRequired')) }), [t]);
  const methods = useForm<RecipeFormValues>({ resolver: yupResolver(schema) as never, defaultValues: defaults });
  const { register, control, handleSubmit, setError, formState: { errors } } = methods;
  const ingredients = useFieldArray({ control, name: 'ingredients' });
  const directions = useFieldArray({ control, name: 'directions' });
  const editing = Boolean(existing);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError(t('recipeAdmin.invalidImage')); return; }
    if (file.size > MAX_PHOTO_BYTES) { setPhotoError(t('recipeAdmin.imageTooLarge')); return; }
    setPhotoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPhotoPreview(dataUrl);
      setPhoto({ imageBase64: dataUrl.split(',')[1], extension: file.name.split('.').pop() || 'jpg', contentType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const submit = (values: RecipeFormValues) => {
    if (hasUnselectedIngredient(values)) { setError('root', { message: t('mealPlanForm.invalidIngredient') }); return; }
    onSubmit(values, photo);
  };
  const formError = photoError ?? errors.root?.message ?? (error !== null ? error || t('recipeAdmin.saveError') : null);
  const input = 'box-border w-full rounded-lg border border-[var(--border-color)] bg-white p-2 hover:border-[var(--accent-primary)]';

  return (
    <FormProvider {...methods}>
      <form noValidate onSubmit={handleSubmit(submit)} className="flex flex-col gap-6">
        {formError && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{formError}</div>}

        <SectionCard title={t('recipeAdmin.name')} icon={<Utensils size={18} />}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField id="recipe-name" label={`${t('recipeAdmin.name')} *`} placeholder={t('recipeAdmin.namePlaceholder')} className="md:col-span-2" error={errors.name?.message} {...register('name')} />
            <TextField id="recipe-price" type="number" min={0} step="0.01" label={t('recipeAdmin.price')} placeholder="0.00" {...register('price')} />
            <div className="flex flex-col gap-[7px]">
              <span className="text-[.8rem] font-semibold text-[var(--text-heading)]">{t('recipeAdmin.photo')}</span>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
                  {photoPreview ? <img src={photoPreview} alt={t('recipeAdmin.photo')} className="h-full w-full object-cover" /> : <Image size={22} />}
                </span>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-color)] bg-white px-3 py-2 text-[.85rem] font-semibold hover:border-[var(--accent-primary)]">
                  <Upload size={15} />{photoPreview ? t('recipeAdmin.changeImage') : t('recipeAdmin.uploadImage')}
                  <input type="file" accept="image/*" hidden aria-label={t('recipeAdmin.photo')} onChange={(event) => { pickPhoto(event.target.files?.[0]); event.target.value = ''; }} />
                </label>
              </div>
            </div>
            <TextField id="recipe-video" label={t('recipeAdmin.video')} placeholder="https://www.youtube.com/watch?v=..." className="md:col-span-2" {...register('videoUrl')} />
            <TextField id="recipe-time" type="number" min={0} step={1} label={t('recipeAdmin.time')} placeholder="15" {...register('time')} />
            <TextField id="recipe-portion" type="number" min={0} step={1} label={t('recipeAdmin.portion')} placeholder="2" {...register('portion')} />
            <SelectField id="recipe-period" label={t('recipeAdmin.period')} {...register('recommendedPeriod')}>
              {ENUM_VALUES.recommendedPeriod.map((item: string) => <option key={item} value={item}>{enumLabel(t, 'recommendedPeriod', item)}</option>)}
            </SelectField>
            <label className="flex items-center gap-2 self-end pb-3 text-[.9rem]"><input type="checkbox" className="h-5 w-5" {...register('isHighlight')} /><span>{t('recipeAdmin.highlight')}</span></label>
            <label className="flex flex-col gap-[7px] md:col-span-2">
              <span className="text-[.8rem] font-semibold text-[var(--text-heading)]">{t('recipeAdmin.description')}</span>
              <textarea rows={3} placeholder={t('recipeAdmin.descriptionPlaceholder')} className={input} {...register('description')} />
            </label>
          </div>
        </SectionCard>

        <SectionCard title={t('recipeAdmin.ingredients')} icon={<Utensils size={18} />}>
          <div className="mb-3 flex justify-end">
            <Button variant="outline" disabled={ingredientOptions.length === 0} onClick={() => ingredients.append(newItem(ingredientOptions[0]?.id ?? ''))}><Plus size={14} />{t('recipeAdmin.addIngredient')}</Button>
          </div>
          {ingredients.fields.length === 0
            ? <p className="m-0 text-[.85rem] text-[var(--text-body)]">{t('recipeAdmin.noIngredients')}</p>
            : ingredients.fields.map((field, index) => <IngredientLineFields key={field.id} name={`ingredients.${index}`} lang={lang} onRemove={() => ingredients.remove(index)} />)}
        </SectionCard>

        <SectionCard title={t('recipeAdmin.steps')} icon={<Utensils size={18} />}>
          <div className="mb-3 flex justify-end"><Button variant="outline" onClick={() => directions.append({ description: '' })}><Plus size={14} />{t('recipeAdmin.addStep')}</Button></div>
          {directions.fields.length === 0
            ? <p className="m-0 text-[.85rem] text-[var(--text-body)]">{t('recipeAdmin.noSteps')}</p>
            : directions.fields.map((field, index) => (
              <div key={field.id} className="mb-2 flex items-start gap-2">
                <span className="mt-2 w-6 shrink-0 text-center font-semibold text-[var(--accent-primary)]">{index + 1}</span>
                <textarea rows={2} aria-label={t('recipeAdmin.step', { n: index + 1 })} placeholder={t('recipeAdmin.stepPlaceholder')} className={input} {...register(`directions.${index}.description`)} />
                <Button variant="outline" onClick={() => directions.remove(index)} title={t('recipeAdmin.removeStep')} aria-label={t('recipeAdmin.removeStep')}><Trash2 size={15} /></Button>
              </div>
            ))}
        </SectionCard>

        <SectionCard title={t('recipeAdmin.restrictions')} icon={<Utensils size={18} />}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField id="recipe-restrictions" label={t('recipeAdmin.restrictions')} placeholder={t('recipeAdmin.restrictionsPlaceholder')} {...register('restrictions')} />
            <TextField id="recipe-tags" label={t('recipeAdmin.tags')} placeholder={t('recipeAdmin.tagsPlaceholder')} {...register('tags')} />
          </div>
        </SectionCard>

        <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
          <Button variant="outline" to={PATHS.RECIPES}><X size={16} />{t('common.cancel')}</Button>
          <Button type="submit" disabled={saving}><Save size={18} />{saving ? t('common.saving') : editing ? t('common.saveChanges') : t('recipeAdmin.newRecipe')}</Button>
        </div>
      </form>
    </FormProvider>
  );
};

export const RecipeFormPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'pt';
  const { id } = useParams();
  const recipeId = id ? Number(id) : undefined;
  const editing = recipeId !== undefined;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { current, loading, error } = useAppSelector((state) => state.recipe);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    dispatch(clearRecipeError());
    const requests: Array<Promise<unknown>> = [dispatch(fetchIngredients(lang)), dispatch(fetchCycles())];
    if (recipeId !== undefined) {
      requests.push(dispatch(fetchRecipeById(recipeId)).then((result) => {
        if (fetchRecipeById.fulfilled.match(result) && result.payload) {
          dispatch(fetchIngredientsByIds((result.payload.ingredients ?? []).map((item) => item.ingredientId || item.ingredient?.id)));
        }
      }));
    }
    Promise.all(requests).then(() => setLoaded(true));
  }, [dispatch, recipeId, lang]);
  useEffect(() => { load(); }, [load]);

  const save = async (values: RecipeFormValues, photo: PhotoPayload | null) => {
    const result = await dispatch(saveRecipe({ id: recipeId, payload: toRecipePayload(values, current ?? undefined), photo }));
    if (saveRecipe.fulfilled.match(result)) navigate(PATHS.RECIPES);
  };

  const title = editing ? t('recipeAdmin.editRecipe') : t('recipeAdmin.newRecipe');
  const loadFailed = editing && loaded && !loading && (error !== null || !current);
  const ready = loaded && !loading && !loadFailed;

  return (
    <div className="mx-auto w-full max-w-[1000px] pb-14">
      <Breadcrumb items={[{ label: t('recipeAdmin.title'), to: PATHS.RECIPES }, { label: title }]} />
      <header className="mb-6 border-b border-[var(--border-color)] pb-4">
        <h2 className="m-0 text-[1.6rem] font-medium text-[var(--text-heading)]">{title}</h2>
      </header>

      {!loaded && <p role="status" className="flex items-center gap-2 text-[var(--text-body)]"><Loader2 size={18} className="animate-spin" />{t('common.loading')}</p>}
      {loadFailed && <ErrorAlert message={error || t('recipeAdmin.formLoadError')} onRetry={load} />}
      {ready && <RecipeForm key={current?.id ?? 'new'} lang={lang} existing={current ?? undefined} defaults={current ? recipeToForm(current) : emptyRecipeForm()} onSubmit={save} />}
    </div>
  );
};
