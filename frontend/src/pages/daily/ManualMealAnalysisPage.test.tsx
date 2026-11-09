import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { ManualMealAnalysisPage } from './ManualMealAnalysisPage';
import { customerDailyMealService, dailyMealService } from '../../services/clinicalService';
import { customerService } from '../../services/customerService';
import { ingredientService } from '../../services/ingredientService';
import { mealAnalysisService } from '../../services/mealAnalysisService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => vi.restoreAllMocks());

const rice = { id: 11, name: 'Arroz', nameEn: 'Rice', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 };

const mockData = () => {
  vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 1 });
  vi.spyOn(dailyMealService, 'getAll').mockResolvedValue([{ id: 5, name: 'Almoço' }, { id: 6, name: 'Jantar' }]);
  vi.spyOn(customerDailyMealService, 'getByCustomerId').mockResolvedValue([]);
  vi.spyOn(ingredientService, 'search').mockResolvedValue({ items: [rice], total: 1 });
};

const addRice = async () => {
  await userEvent.click(await screen.findByRole('combobox'));
  await userEvent.click(await screen.findByRole('option', { name: /Arroz/ }));
  await userEvent.click(screen.getByRole('button', { name: 'manualMealAnalysis.quickAdd' }));
};

describe('ManualMealAnalysisPage', () => {
  it('seleciona a primeira refeição e permite trocar', async () => {
    mockData();
    renderWithApp(<ManualMealAnalysisPage />);
    expect(await screen.findByRole('button', { name: 'Almoço' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Jantar' }));
    expect(screen.getByRole('button', { name: 'Jantar' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('avisa quando não há refeições disponíveis', async () => {
    mockData();
    vi.spyOn(dailyMealService, 'getAll').mockResolvedValue([]);
    renderWithApp(<ManualMealAnalysisPage />);
    expect(await screen.findByText('manualMealAnalysis.noSlotsAvailable')).toBeInTheDocument();
  });

  it('adiciona um ingrediente calculando os macros e mostra o resumo', async () => {
    mockData();
    renderWithApp(<ManualMealAnalysisPage />);
    await userEvent.click(await screen.findByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: /Arroz/ }));
    await userEvent.clear(screen.getByLabelText('manualMealAnalysis.quantity'));
    await userEvent.type(screen.getByLabelText('manualMealAnalysis.quantity'), '200');
    expect(screen.getByText('260 kcal')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'manualMealAnalysis.quickAdd' }));
    expect(screen.getAllByText('260 kcal').length).toBeGreaterThan(0);
    expect(screen.getByText('manualMealAnalysis.summaryTitle')).toBeInTheDocument();
  });

  it('remove um item da lista', async () => {
    mockData();
    renderWithApp(<ManualMealAnalysisPage />);
    await addRice();
    await userEvent.click(screen.getByRole('button', { name: 'manualMealAnalysis.removeItem' }));
    expect(screen.getByText('manualMealAnalysis.emptyItemsMessage')).toBeInTheDocument();
    expect(screen.queryByText('manualMealAnalysis.summaryTitle')).not.toBeInTheDocument();
  });

  it('envia a análise e mostra os pontos e o resultado', async () => {
    mockData();
    const analyze = vi.spyOn(mealAnalysisService, 'analyzeManual').mockResolvedValue({
      points_awarded: 10, totals: { calories: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 }, items: [{ name: 'Arroz', estimated_grams: 100, calories: 130 }],
    });
    renderWithApp(<ManualMealAnalysisPage />);
    await addRice();
    await userEvent.click(screen.getByRole('button', { name: /manualMealAnalysis.submit/ }));
    await waitFor(() => expect(analyze).toHaveBeenCalledWith(expect.objectContaining({ daily_meal_id: 5, items: [{ ingredient_id: 11, quantity: 100, unit: 'Grams' }] })));
    expect(await screen.findByText('manualMealAnalysis.successTitle')).toBeInTheDocument();
    expect(screen.getByText('manualMealAnalysis.pointsAwarded')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /manualMealAnalysis.logAnother/ }));
    expect(await screen.findByText('manualMealAnalysis.emptyItemsMessage')).toBeInTheDocument();
  });

  it('mostra a mensagem da API quando o envio falha', async () => {
    mockData();
    vi.spyOn(mealAnalysisService, 'analyzeManual').mockRejectedValue({ response: { data: { message: 'cota excedida' } } });
    renderWithApp(<ManualMealAnalysisPage />);
    await addRice();
    await userEvent.click(screen.getByRole('button', { name: /manualMealAnalysis.submit/ }));
    expect(await screen.findByText('cota excedida')).toBeInTheDocument();
    expect(screen.queryByText('manualMealAnalysis.successTitle')).not.toBeInTheDocument();
  });
});
