import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { RecipeListPage } from './RecipeListPage';
import { RecipeFormPage } from './RecipeFormPage';
import { cycleService } from '../../services/cycleService';
import { eatService } from '../../services/eatService';
import { ingredientService } from '../../services/ingredientService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const rice = { id: 11, name: 'Arroz', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 };
const recipe = {
  id: 5, name: 'Omelete', price: 12.5, time: 15, portion: 2, description: 'Rápida', isHighlight: true, recommendedPeriod: 'Weekly', views: 3, additions: 1,
  ingredients: [{ ingredientId: 11, quantity: 100, unit: 'Grams' }], directions: [{ stepNumber: 1, description: 'Bata os ovos' }],
  restrictions: [{ id: 1, name: 'Sem Glúten' }], tags: [{ id: 2, name: 'Rápido' }], total_macros: { kcal: 300, protein_g: 20, carbs_g: 5 },
};

const mockCatalogs = () => {
  vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [rice] });
  vi.spyOn(ingredientService, 'getByIds').mockResolvedValue([rice]);
  vi.spyOn(cycleService, 'getAll').mockResolvedValue([]);
};

describe('RecipeListPage', () => {
  it('lista as receitas com preço, tempo, macros e link de edição', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValue({ content: [recipe], total_pages: 1, total_elements: 1 });
    renderWithApp(<RecipeListPage />);
    expect(await screen.findByText('Omelete')).toBeInTheDocument();
    expect(screen.getByText('R$ 12.50')).toBeInTheDocument();
    expect(screen.getByText('🔥 300 kcal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/recipes/5/edit');
  });

  it('filtra por período e destaque na API', async () => {
    const page = vi.spyOn(eatService, 'getPaginated').mockResolvedValue({ content: [recipe], total_pages: 1, total_elements: 1 });
    renderWithApp(<RecipeListPage />);
    await screen.findByText('Omelete');
    await userEvent.selectOptions(screen.getByLabelText('recipeAdmin.period'), 'Monthly');
    await userEvent.selectOptions(screen.getByLabelText('recipeAdmin.highlight'), 'true');
    await waitFor(() => expect(page).toHaveBeenLastCalledWith({ page: 1, size: 10, recommended_period: 'Monthly', is_highlight: true }));
  });

  it('exclui depois de confirmar; se a API recusar, mostra o erro e mantém a confirmação', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValue({ content: [recipe], total_pages: 1, total_elements: 1 });
    const remove = vi.spyOn(eatService, 'delete').mockRejectedValueOnce({}).mockResolvedValueOnce({});
    renderWithApp(<RecipeListPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'common.delete' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    expect(await screen.findByText('recipeAdmin.deleteError')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    expect(await screen.findByText('recipeAdmin.deleted')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValueOnce({ content: [] });
    const { unmount } = renderWithApp(<RecipeListPage />);
    expect(await screen.findByText('recipeAdmin.empty')).toBeInTheDocument();
    unmount();
    vi.spyOn(eatService, 'getPaginated').mockRejectedValueOnce({});
    renderWithApp(<RecipeListPage />);
    expect(await screen.findByText('recipeAdmin.loadError')).toBeInTheDocument();
  });
});

describe('RecipeFormPage', () => {
  it('exige o nome da receita', async () => {
    mockCatalogs();
    const create = vi.spyOn(eatService, 'create');
    renderWithApp(<RecipeFormPage />, { route: '/recipes/new', path: '/recipes/new' });
    await userEvent.click(await screen.findByRole('button', { name: /recipeAdmin.newRecipe/ }));
    expect(await screen.findByText('recipeAdmin.nameRequired')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra com ingrediente, passos e listas separadas por vírgula', async () => {
    mockCatalogs();
    const create = vi.spyOn(eatService, 'create').mockResolvedValue({ id: 9 });
    renderWithApp(<RecipeFormPage />, { route: '/recipes/new', path: '/recipes/new' });
    await userEvent.type(await screen.findByLabelText(/recipeAdmin.name/), 'Panqueca');
    await userEvent.type(screen.getByLabelText('recipeAdmin.price'), '8.9');
    await waitFor(() => expect(screen.getByRole('button', { name: /recipeAdmin.addIngredient/ })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /recipeAdmin.addIngredient/ }));
    await userEvent.click(screen.getByRole('button', { name: /recipeAdmin.addStep/ }));
    await userEvent.type(screen.getByLabelText('recipeAdmin.step'), 'Misture tudo');
    await userEvent.type(screen.getByLabelText('recipeAdmin.restrictions'), 'Sem Glúten, Vegano');
    await userEvent.click(screen.getByRole('button', { name: /recipeAdmin.newRecipe/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Panqueca', price: 8.9, time: null,
      ingredients: [{ ingredientId: 11, quantity: 100, unit: 'Grams', substitutes: [] }],
      directions: [{ stepNumber: 1, description: 'Misture tudo' }],
      restrictions: [{ id: 0, name: 'Sem Glúten' }, { id: 0, name: 'Vegano' }],
    })));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('rejeita arquivo que não é imagem e envia a foto escolhida junto com a receita', async () => {
    mockCatalogs();
    const create = vi.spyOn(eatService, 'create').mockResolvedValue({ id: 9 });
    const upload = vi.spyOn(eatService, 'uploadPhoto').mockResolvedValue({});
    renderWithApp(<RecipeFormPage />, { route: '/recipes/new', path: '/recipes/new' });
    await userEvent.type(await screen.findByLabelText(/recipeAdmin.name/), 'Panqueca');
    const input = screen.getByLabelText('recipeAdmin.photo', { selector: 'input' });
    await userEvent.upload(input, new File(['x'], 'a.txt', { type: 'text/plain' }), { applyAccept: false });
    expect(await screen.findByText('recipeAdmin.invalidImage')).toBeInTheDocument();
    await userEvent.upload(input, new File(['abc'], 'foto.png', { type: 'image/png' }));
    await waitFor(() => expect(screen.getByAltText('recipeAdmin.photo')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /recipeAdmin.newRecipe/ }));
    await waitFor(() => expect(upload).toHaveBeenCalledWith(9, expect.objectContaining({ extension: 'png', contentType: 'image/png' })));
    expect(create).toHaveBeenCalled();
  });

  it('carrega a receita na edição, preserva contadores e atualiza pelo id', async () => {
    mockCatalogs();
    vi.spyOn(eatService, 'getById').mockResolvedValue(recipe);
    const update = vi.spyOn(eatService, 'update').mockResolvedValue({});
    renderWithApp(<RecipeFormPage />, { route: '/recipes/5/edit', path: '/recipes/:id/edit' });
    expect(await screen.findByDisplayValue('Omelete')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bata os ovos')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Sem Glúten')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.saveChanges/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'Omelete', price: 12.5, views: 3, additions: 1, isHighlight: true })));
  });

  it('mostra a mensagem da API ao falhar e erro quando a receita não carrega', async () => {
    mockCatalogs();
    vi.spyOn(eatService, 'getById').mockResolvedValue(recipe);
    vi.spyOn(eatService, 'update').mockRejectedValue({ response: { data: { message: 'nome repetido' } } });
    const { unmount } = renderWithApp(<RecipeFormPage />, { route: '/recipes/5/edit', path: '/recipes/:id/edit' });
    await userEvent.click(await screen.findByRole('button', { name: /common.saveChanges/ }));
    expect(await screen.findByText('nome repetido')).toBeInTheDocument();
    unmount();
    vi.spyOn(eatService, 'getById').mockRejectedValue({});
    renderWithApp(<RecipeFormPage />, { route: '/recipes/9/edit', path: '/recipes/:id/edit' });
    expect(await screen.findByText('recipeAdmin.formLoadError')).toBeInTheDocument();
  });
});
