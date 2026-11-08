import { screen } from '@testing-library/react';
import { renderWithApp } from '../../test/render';
import { CustomerEatListPage } from './CustomerEatListPage';
import { CustomerEatDetailPage } from './CustomerEatDetailPage';
import { eatService } from '../../services/eatService';
import { ingredientService } from '../../services/ingredientService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const recipe = {
  id: 5, name: 'Omelete', time: 15, portion: 2, price: 12.5, isHighlight: true, description: 'Rápida', videoUrl: 'https://yt/x',
  total_macros: { kcal: 300, protein_g: 20, carbs_g: 5, fat_g: 10 },
  ingredients: [{ ingredientId: 11, quantity: 2, unit: 'Units' }], directions: [{ stepNumber: 1, description: 'Bata os ovos' }],
  restrictions: [{ id: 1, name: 'Sem Glúten' }], tags: [{ id: 2, name: 'Rápido' }],
};

describe('CustomerEatListPage', () => {
  it('lista as receitas com tempo e calorias, com link para o detalhe', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValue({ content: [recipe], total_pages: 1, total_elements: 1 });
    renderWithApp(<CustomerEatListPage />);
    expect(await screen.findByText('Omelete')).toBeInTheDocument();
    expect(screen.getByText('300 kcal')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Omelete/ })).toHaveAttribute('href', '/eat/5');
  });

  it('mostra estado vazio e erro de carregamento', async () => {
    vi.spyOn(eatService, 'getPaginated').mockResolvedValueOnce({ content: [] });
    const { unmount } = renderWithApp(<CustomerEatListPage />);
    expect(await screen.findByText('eat.noRecipeFound')).toBeInTheDocument();
    unmount();
    vi.spyOn(eatService, 'getPaginated').mockRejectedValueOnce({});
    renderWithApp(<CustomerEatListPage />);
    expect(await screen.findByText('eat.errorLoadingRecipes')).toBeInTheDocument();
  });
});

describe('CustomerEatDetailPage', () => {
  it('mostra a receita com macros, ingredientes pelo nome, passos e etiquetas', async () => {
    vi.spyOn(eatService, 'getById').mockResolvedValue(recipe);
    vi.spyOn(ingredientService, 'getByIds').mockResolvedValue([{ id: 11, name: 'Ovo' }]);
    renderWithApp(<CustomerEatDetailPage />, { route: '/eat/5', path: '/eat/:id' });
    expect(await screen.findByRole('heading', { name: 'Omelete' })).toBeInTheDocument();
    expect(screen.getByText('R$ 12.50')).toBeInTheDocument();
    expect(await screen.findByText(/Ovo — 2/)).toBeInTheDocument();
    expect(screen.getByText('Bata os ovos')).toBeInTheDocument();
    expect(screen.getByText('Sem Glúten')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /eat.watchVideo/ })).toHaveAttribute('href', 'https://yt/x');
  });

  it('mostra erro quando a receita não carrega', async () => {
    vi.spyOn(eatService, 'getById').mockRejectedValue({});
    renderWithApp(<CustomerEatDetailPage />, { route: '/eat/9', path: '/eat/:id' });
    expect(await screen.findByText('eat.recipeNotFound')).toBeInTheDocument();
  });
});
