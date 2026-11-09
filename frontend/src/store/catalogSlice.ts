import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { findCatalog } from '../config/catalogs';
import type { CatalogItem } from '../types/catalog';

interface CatalogState {
  items: Record<string, CatalogItem[]>;
  loading: Record<string, boolean>;
  saving: boolean;
  error: Record<string, string | null>;
}

const initialState: CatalogState = { items: {}, loading: {}, saving: false, error: {} };

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const serviceOf = (key: string) => {
  const catalog = findCatalog(key);
  if (!catalog) throw new Error(`Catálogo desconhecido: ${key}`);
  return catalog.service;
};

export const fetchCatalog = createAsyncThunk(
  'catalog/fetch',
  async (key: string, { rejectWithValue }) => {
    try {
      const data = await serviceOf(key).getAll();
      return { key, data: Array.isArray(data) ? (data as CatalogItem[]) : [] };
    } catch (err) {
      return rejectWithValue({ key, message: messageOf(err, 'Falha ao carregar registros') });
    }
  },
);

export const saveCatalogItem = createAsyncThunk(
  'catalog/save',
  async ({ key, id, name }: { key: string; id?: number; name: string }, { rejectWithValue }) => {
    try {
      const service = serviceOf(key);
      return id === undefined ? await service.create({ name }) : await service.update(id, { name });
    } catch (err) {
      return rejectWithValue({ key, message: messageOf(err, 'Falha ao salvar registro') });
    }
  },
);

type Rejection = { key: string; message: string };

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    clearCatalogError: (state, { payload }: { payload: string }) => { state.error[payload] = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCatalog.pending, (state, { meta }) => {
        state.loading[meta.arg] = true;
        state.error[meta.arg] = null;
      })
      .addCase(fetchCatalog.fulfilled, (state, { payload }) => {
        state.loading[payload.key] = false;
        state.items[payload.key] = payload.data;
      })
      .addCase(fetchCatalog.rejected, (state, { meta, payload }) => {
        state.loading[meta.arg] = false;
        state.error[meta.arg] = (payload as Rejection | undefined)?.message ?? 'Erro';
      })
      .addCase(saveCatalogItem.pending, (state, { meta }) => {
        state.saving = true;
        state.error[meta.arg.key] = null;
      })
      .addCase(saveCatalogItem.fulfilled, (state) => { state.saving = false; })
      .addCase(saveCatalogItem.rejected, (state, { meta, payload }) => {
        state.saving = false;
        state.error[meta.arg.key] = (payload as Rejection | undefined)?.message ?? 'Erro';
      });
  },
});

export const { clearCatalogError } = catalogSlice.actions;
export default catalogSlice.reducer;
export type { CatalogState };
