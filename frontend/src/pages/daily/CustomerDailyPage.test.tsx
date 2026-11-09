import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithApp } from '../../test/render';
import { CustomerDailyPage } from './CustomerDailyPage';
import { customerDailyMealService, dailyMealService } from '../../services/clinicalService';
import { customerService } from '../../services/customerService';
import { mealAnalysisService } from '../../services/mealAnalysisService';
import { mealLogService } from '../../services/mealLogService';

vi.mock('react-i18next', async () => (await import('../../test/render')).i18nMock);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const photo = () => new File(['x'], 'prato.jpg', { type: 'image/jpeg' });
const done = { status: 'completed', totals: { calories: 420, protein_g: 20, carbs_g: 50, fat_g: 10 }, items: [{ name: 'Arroz', calories: 200 }] };

const mockAll = (logs: unknown[] = []) => {
  vi.spyOn(customerService, 'getMe').mockResolvedValue({ id: 3 });
  vi.spyOn(dailyMealService, 'getAll').mockResolvedValue([{ id: 1, name: 'Café' }, { id: 2, name: 'Almoço' }]);
  vi.spyOn(customerDailyMealService, 'getByCustomerId').mockResolvedValue([{ dailyMealId: 1 }, { dailyMealId: 2 }]);
  vi.spyOn(mealLogService, 'getLogsByDate').mockResolvedValue(logs);
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:preview' });
};

describe('CustomerDailyPage', () => {
  it('lista as refeições registradas do dia e expande o detalhe', async () => {
    mockAll([{ log_id: 1, daily_meal_id: 2, totals: { calories: 650 }, items: [{ name: 'Feijão', calories: 120 }] }]);
    renderWithApp(<CustomerDailyPage />);
    const row = await screen.findByRole('button', { name: /Almoço.*650 kcal/ });
    expect(row).toHaveTextContent('650 kcal');
    await userEvent.click(row);
    expect(screen.getByText('Feijão')).toBeInTheDocument();
  });

  it('recarrega as refeições ao trocar a data e mostra estado vazio', async () => {
    mockAll();
    const logs = vi.spyOn(mealLogService, 'getLogsByDate');
    renderWithApp(<CustomerDailyPage />);
    expect(await screen.findByText('daily.noMealsForDate')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('daily.date'));
    await userEvent.type(screen.getByLabelText('daily.date'), '2026-01-05');
    await waitFor(() => expect(logs).toHaveBeenLastCalledWith('2026-01-05'));
  });

  it('só libera a foto depois de escolher a refeição', async () => {
    mockAll();
    renderWithApp(<CustomerDailyPage />);
    const input = await screen.findByLabelText(/daily.analyzeMeal/, { selector: 'input' });
    expect(input).toBeDisabled();
    await userEvent.click(await screen.findByRole('button', { name: 'Almoço' }));
    expect(input).toBeEnabled();
  });

  it('analisa a foto: manda refeição e data, mostra o resultado e recarrega o diário', async () => {
    mockAll();
    const analyze = vi.spyOn(mealAnalysisService, 'analyzePhoto').mockResolvedValue(done);
    renderWithApp(<CustomerDailyPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Almoço' }));
    await userEvent.upload(screen.getByLabelText(/daily.analyzeMeal/, { selector: 'input' }), photo());
    expect(await screen.findByText('daily.analysisResult')).toBeInTheDocument();
    expect(screen.getByText('420 kcal')).toBeInTheDocument();
    expect(screen.getByText('daily.mealSavedDiary')).toBeInTheDocument();
    const form = analyze.mock.calls[0][0] as FormData;
    expect(form.get('daily_meal_id')).toBe('2');
    await userEvent.click(screen.getByRole('button', { name: /daily.registerAnother/ }));
    expect(await screen.findByText('daily.chooseMeal')).toBeInTheDocument();
  });

  it('mostra a mensagem da API quando a análise falha e permite tentar de novo', async () => {
    mockAll();
    vi.spyOn(mealAnalysisService, 'analyzePhoto').mockRejectedValue({ response: { data: { message: 'cota excedida' } } });
    renderWithApp(<CustomerDailyPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Almoço' }));
    await userEvent.upload(screen.getByLabelText(/daily.analyzeMeal/, { selector: 'input' }), photo());
    expect(await screen.findByText('cota excedida')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /common.tryAgain/ }));
    expect(await screen.findByText('daily.chooseMeal')).toBeInTheDocument();
  });

  it('recusa arquivo que não é imagem', async () => {
    mockAll();
    const analyze = vi.spyOn(mealAnalysisService, 'analyzePhoto');
    renderWithApp(<CustomerDailyPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Almoço' }));
    await userEvent.upload(screen.getByLabelText(/daily.analyzeMeal/, { selector: 'input' }), new File(['x'], 'a.txt', { type: 'text/plain' }), { applyAccept: false });
    expect(await screen.findByText('daily.invalidImage')).toBeInTheDocument();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('sair da tela durante a análise interrompe a espera', async () => {
    mockAll();
    vi.spyOn(mealAnalysisService, 'analyzePhoto').mockResolvedValue({ status: 'pending', analysis_id: 8 });
    const poll = vi.spyOn(mealAnalysisService, 'getAnalysis').mockResolvedValue({ status: 'pending' });
    const { unmount } = renderWithApp(<CustomerDailyPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Almoço' }));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await userEvent.upload(screen.getByLabelText(/daily.analyzeMeal/, { selector: 'input' }), photo());
    await screen.findByText('daily.analyzingMeal');
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(poll).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
