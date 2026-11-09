import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { IngredientListPage } from './IngredientListPage';
import { IngredientFormPage } from './IngredientFormPage';
import { ingredientService } from '../../services/ingredientService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
vi.mock('../../components/common/CsvImportModal', () => ({ CsvImportModal: () => null }));
afterEach(() => vi.restoreAllMocks());

const own = { id: 1, name: 'Arroz da casa', tenantId: 3, kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 };
const taco = { id: 2, name: 'Feijão TACO', tenantId: null, tacoId: 5, kcal: 77, protein: 4.5, carbs: 14, fat: 0.5, fiber: 8 };

describe('IngredientListPage', () => {
  it('lista a página, com edição só para ingredientes da clínica (TACO é só leitura)', async () => {
    vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [own, taco], total: 2 });
    renderWithApp(<IngredientListPage />);
    const row = (await screen.findByText('Arroz da casa')).closest('tr') as HTMLElement;
    expect(within(row).getByRole('link', { name: /common.edit/ })).toHaveAttribute('href', '/ingredients/1/edit');
    const tacoRow = screen.getByText('Feijão TACO').closest('tr') as HTMLElement;
    expect(within(tacoRow).queryByRole('link', { name: /common.edit/ })).not.toBeInTheDocument();
    expect(within(tacoRow).queryByRole('button', { name: 'common.delete' })).not.toBeInTheDocument();
  });

  it('busca no servidor depois do atraso, voltando à primeira página', async () => {
    const search = vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [own], total: 1 });
    renderWithApp(<IngredientListPage />);
    await screen.findByText('Arroz da casa');
    await userEvent.type(screen.getByRole('searchbox'), 'arroz');
    await waitFor(() => expect(search).toHaveBeenLastCalledWith({ q: 'arroz', lang: 'pt', limit: 10, offset: 0 }));
  });

  it('abre os detalhes, pede confirmação e exclui', async () => {
    vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [own], total: 1 });
    const del = vi.spyOn(ingredientService, 'delete').mockResolvedValue({});
    renderWithApp(<IngredientListPage />);
    await userEvent.click(await screen.findByRole('button', { name: /common.view/ }));
    expect(screen.getByRole('dialog', { name: 'Arroz da casa' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'common.delete' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    await waitFor(() => expect(del).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('mostra o erro da exclusão e mantém a confirmação aberta', async () => {
    vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [own], total: 1 });
    vi.spyOn(ingredientService, 'delete').mockRejectedValue({});
    renderWithApp(<IngredientListPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'common.delete' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'common.delete' }));
    expect(await screen.findByText('ingredients.deleteError')).toBeInTheDocument();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(ingredientService, 'search').mockResolvedValueOnce({ items: [], total: 0 });
    const { unmount } = renderWithApp(<IngredientListPage />);
    expect(await screen.findByText('ingredients.empty')).toBeInTheDocument();
    unmount();
    vi.spyOn(ingredientService, 'search').mockRejectedValueOnce({});
    renderWithApp(<IngredientListPage />);
    expect(await screen.findByText('ingredients.loadError')).toBeInTheDocument();
  });
});

describe('IngredientFormPage', () => {
  it('exige nome e macros, mesmo com a aba dos macros escondida', async () => {
    const create = vi.spyOn(ingredientService, 'create');
    renderWithApp(<IngredientFormPage />, { route: '/ingredients/new', path: '/ingredients/new' });
    await userEvent.click(await screen.findByRole('button', { name: /common.save/ }));
    expect((await screen.findAllByText('ingredients.fieldRequired')).length).toBeGreaterThanOrEqual(6);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejeita número negativo num campo opcional de outra aba', async () => {
    const create = vi.spyOn(ingredientService, 'create');
    renderWithApp(<IngredientFormPage />, { route: '/ingredients/new', path: '/ingredients/new' });
    await userEvent.type(await screen.findByLabelText(/common.name/), 'Aveia');
    for (const field of ['kcal', 'protein', 'carbs', 'fat', 'fiber']) await userEvent.type(screen.getByLabelText(new RegExp(`ingredients.${field}`)), '1');
    await userEvent.click(screen.getByRole('tab', { name: /ingredients.tabMinerals/ }));
    await userEvent.type(screen.getByLabelText('ingredients.iron'), '-3');
    await userEvent.click(screen.getByRole('button', { name: /common.save/ }));
    expect(await screen.findByText('ingredients.numberInvalid')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('cadastra com macros numéricos e opcionais nulos', async () => {
    const create = vi.spyOn(ingredientService, 'create').mockResolvedValue({});
    renderWithApp(<IngredientFormPage />, { route: '/ingredients/new', path: '/ingredients/new' });
    await userEvent.type(await screen.findByLabelText(/common.name/), 'Aveia');
    const values: Record<string, string> = { kcal: '389', protein: '17', carbs: '66', fat: '7', fiber: '10' };
    for (const [field, value] of Object.entries(values)) await userEvent.type(screen.getByLabelText(new RegExp(`ingredients.${field}`)), value);
    await userEvent.click(screen.getByRole('button', { name: /common.save/ }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aveia', kcal: 389, fiber: 10, calcium: null, tacoId: null })));
    expect(await screen.findByTestId('elsewhere')).toBeInTheDocument();
  });

  it('carrega o ingrediente na edição e atualiza pelo id', async () => {
    vi.spyOn(ingredientService, 'getById').mockResolvedValue(own);
    const update = vi.spyOn(ingredientService, 'update').mockResolvedValue({});
    renderWithApp(<IngredientFormPage />, { route: '/ingredients/1/edit', path: '/ingredients/:id/edit' });
    expect(await screen.findByDisplayValue('Arroz da casa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.save/ }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Arroz da casa', kcal: 130 })));
  });

  it('mostra o erro quando o ingrediente não carrega', async () => {
    vi.spyOn(ingredientService, 'getById').mockRejectedValue({});
    renderWithApp(<IngredientFormPage />, { route: '/ingredients/9/edit', path: '/ingredients/:id/edit' });
    expect(await screen.findByText('ingredients.loadError')).toBeInTheDocument();
  });
});
