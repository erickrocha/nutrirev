import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { cityService, provinceService } from '../services/clinicalService';
import type { AddressCity, AddressProvince } from '../types/customer';

interface AddressState {
  provinces: AddressProvince[];
  cities: AddressCity[];
  loadingProvinces: boolean;
  loadingCities: boolean;
}

const initialState: AddressState = { provinces: [], cities: [], loadingProvinces: false, loadingCities: false };

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// Falha ao carregar estados ou cidades deixa a lista vazia: o formulário continua usável.
export const fetchProvinces = createAsyncThunk('address/provinces', async (countryCode: string) => {
  try {
    return list<AddressProvince>(await provinceService.getAll(countryCode));
  } catch {
    return [] as AddressProvince[];
  }
});

export const fetchCities = createAsyncThunk('address/cities', async (provinceId: number) => {
  try {
    return list<AddressCity>(await cityService.getByProvinceId(provinceId));
  } catch {
    return [] as AddressCity[];
  }
});

const slice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    clearCities: (state) => { state.cities = []; },
    clearProvinces: (state) => { state.provinces = []; state.cities = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProvinces.pending, (state) => { state.loadingProvinces = true; })
      .addCase(fetchProvinces.fulfilled, (state, { payload }) => { state.loadingProvinces = false; state.provinces = payload; })
      .addCase(fetchCities.pending, (state) => { state.loadingCities = true; })
      .addCase(fetchCities.fulfilled, (state, { payload }) => { state.loadingCities = false; state.cities = payload; });
  },
});

export const { clearCities, clearProvinces } = slice.actions;
export default slice.reducer;
export type { AddressState };
