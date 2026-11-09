import { configureStore } from '@reduxjs/toolkit';
import reducer, { importCsv, resetCsvImport } from './csvImportSlice';
import { findCatalog } from '../config/catalogs';
import { ingredientService } from '../services/ingredientService';

const makeStore = () => configureStore({ reducer: { csvImport: reducer } });
const file = new File(['name\nA'], 'a.csv', { type: 'text/csv' });
afterEach(() => vi.restoreAllMocks());

describe('csvImportSlice', () => {
  it('importa pelo serviço do catálogo e guarda o resultado', async () => {
    const spy = vi.spyOn(findCatalog('bowel_function')!.service, 'importCsv').mockResolvedValue({ total: 1, created: 1, updated: 0 });
    const store = makeStore();
    await store.dispatch(importCsv({ target: 'bowel_function', file, tenantId: 2 }));
    expect(spy).toHaveBeenCalledWith(file, 2);
    expect(store.getState().csvImport.result).toEqual({ total: 1, created: 1, updated: 0 });
    expect(store.getState().csvImport.importing).toBe(false);
  });

  it('usa o serviço de ingredientes para o destino "ingredient"', async () => {
    const spy = vi.spyOn(ingredientService, 'importCsv').mockResolvedValue({ total: 2, created: 2, updated: 0 });
    await makeStore().dispatch(importCsv({ target: 'ingredient', file }));
    expect(spy).toHaveBeenCalled();
  });

  it('guarda mensagem e erros por linha devolvidos pela API', async () => {
    vi.spyOn(findCatalog('formula')!.service, 'importCsv').mockRejectedValue({
      response: { data: { message: 'inválido', errors: [{ row: 3, column: 'name', message: 'duplicado' }] } },
    });
    const store = makeStore();
    await store.dispatch(importCsv({ target: 'formula', file }));
    expect(store.getState().csvImport.error).toBe('inválido');
    expect(store.getState().csvImport.serverErrors).toEqual([{ row: 3, column: 'name', message: 'duplicado' }]);
  });

  it('limpa o estado ao reiniciar', async () => {
    vi.spyOn(findCatalog('formula')!.service, 'importCsv').mockResolvedValue({ total: 1, created: 1, updated: 0 });
    const store = makeStore();
    await store.dispatch(importCsv({ target: 'formula', file }));
    store.dispatch(resetCsvImport());
    expect(store.getState().csvImport.result).toBeNull();
  });
});
