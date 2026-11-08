import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { findCatalog } from '../config/catalogs';
import { ingredientService } from '../services/ingredientService';

export interface CsvImportResult {
  total: number;
  created: number;
  updated: number;
}

export interface CsvServerError {
  row?: number;
  column?: string;
  message: string;
}

interface CsvImportState {
  importing: boolean;
  result: CsvImportResult | null;
  error: string | null;
  serverErrors: CsvServerError[];
}

const initialState: CsvImportState = { importing: false, result: null, error: null, serverErrors: [] };

/** Ingredientes ficam fora de `config/catalogs`; os demais alvos são as chaves dos catálogos. */
export const INGREDIENT_TARGET = 'ingredient';

const importerOf = (target: string) => {
  const importer = target === INGREDIENT_TARGET ? ingredientService : findCatalog(target)?.service;
  if (!importer) throw new Error(`Destino de importação desconhecido: ${target}`);
  return importer;
};

interface Rejection { message: string | null; errors: CsvServerError[] }

export const importCsv = createAsyncThunk(
  'csvImport/import',
  async ({ target, file, tenantId }: { target: string; file: File; tenantId?: number }, { rejectWithValue }) => {
    try {
      return (await importerOf(target).importCsv(file, tenantId)) as CsvImportResult;
    } catch (err) {
      const data = (err as { response?: { data?: { message?: string; errors?: CsvServerError[] } } }).response?.data;
      return rejectWithValue({ message: data?.message ?? null, errors: Array.isArray(data?.errors) ? data.errors : [] } as Rejection);
    }
  },
);

const csvImportSlice = createSlice({
  name: 'csvImport',
  initialState,
  reducers: {
    resetCsvImport: () => initialState,
    clearCsvImportErrors: (state) => { state.error = null; state.serverErrors = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(importCsv.pending, (state) => { state.importing = true; state.error = null; state.serverErrors = []; })
      .addCase(importCsv.fulfilled, (state, { payload }) => { state.importing = false; state.result = payload; })
      .addCase(importCsv.rejected, (state, { payload }) => {
        const rejection = payload as Rejection | undefined;
        state.importing = false;
        state.error = rejection?.message ?? '';
        state.serverErrors = rejection?.errors ?? [];
      });
  },
});

export const { resetCsvImport, clearCsvImportErrors } = csvImportSlice.actions;
export default csvImportSlice.reducer;
export type { CsvImportState };
