import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { customerService } from '../services/customerService';
import {
  bowelFunctionService,
  clinicalPlanService,
  customerBowelFunctionService,
  customerDailyMealService,
  customerDietaryRestrictionService,
  customerPreExistingConditionsService,
  dailyMealService,
  dietaryRestrictionService,
  preExistingConditionsService,
  prepareMealService,
} from '../services/clinicalService';
import type {
  CatalogOption,
  Customer,
  CustomerAssociations,
  CustomerFormCatalogs,
  CustomerPayload,
} from '../types/customer';

interface CustomerFormState {
  catalogs: CustomerFormCatalogs;
  customer: Customer | null;
  associations: CustomerAssociations;
  uploadingPhoto: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const EMPTY_ASSOCIATIONS: CustomerAssociations = {
  restrictionIds: [], bowelFunctionIds: [], conditionIds: [], dailyMealIds: [],
};

const initialState: CustomerFormState = {
  catalogs: {
    clinicalPlans: [], prepareMeals: [], dietaryRestrictions: [],
    bowelFunctions: [], preExistingConditions: [], dailyMeals: [],
  },
  customer: null,
  associations: EMPTY_ASSOCIATIONS,
  uploadingPhoto: false,
  loading: false,
  saving: false,
  error: null,
};

const messageOf = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

type JoinRow = Record<string, number | undefined>;

// Cada tabela de junção expõe o id nos dois formatos (camelCase e snake_case).
interface JoinConfig {
  service: {
    getByCustomerId: (customerId: number) => Promise<unknown>;
    create: (data: Record<string, number>) => Promise<unknown>;
    delete: (customerId: number, id: number) => Promise<unknown>;
  };
  camel: string;
  snake: string;
  select: (associations: CustomerAssociations) => number[];
}

const JOINS: JoinConfig[] = [
  { service: customerDietaryRestrictionService, camel: 'dietaryRestrictionId', snake: 'dietary_restriction_id', select: (a) => a.restrictionIds },
  { service: customerBowelFunctionService, camel: 'bowelFunctionId', snake: 'bowel_function_id', select: (a) => a.bowelFunctionIds },
  { service: customerPreExistingConditionsService, camel: 'preExistingConditionsId', snake: 'pre_existing_conditions_id', select: (a) => a.conditionIds },
  { service: customerDailyMealService, camel: 'dailyMealId', snake: 'daily_meal_id', select: (a) => a.dailyMealIds },
];

const idsOf = (rows: unknown, join: JoinConfig): number[] =>
  list<JoinRow>(rows).map((row) => (row[join.camel] ?? row[join.snake]) as number);

const fetchAssociations = async (customerId: number): Promise<CustomerAssociations> => {
  const [restrictionIds, bowelFunctionIds, conditionIds, dailyMealIds] = await Promise.all(
    JOINS.map(async (join) => idsOf(await join.service.getByCustomerId(customerId), join)),
  );
  return { restrictionIds, bowelFunctionIds, conditionIds, dailyMealIds };
};

const syncAssociations = async (customerId: number, wanted: CustomerAssociations) => {
  for (const join of JOINS) {
    const existing = idsOf(await join.service.getByCustomerId(customerId), join);
    const selected = join.select(wanted);
    for (const id of selected.filter((value) => !existing.includes(value))) {
      await join.service.create({ customerId, [join.camel]: id });
    }
    for (const id of existing.filter((value) => !selected.includes(value))) {
      await join.service.delete(customerId, id);
    }
  }
};

export const loadCustomerForm = createAsyncThunk(
  'customerForm/load',
  async (customerId: number | undefined, { rejectWithValue }) => {
    try {
      const [clinicalPlans, prepareMeals, dietaryRestrictions, bowelFunctions, preExistingConditions, dailyMeals] =
        await Promise.all([
          clinicalPlanService.getAll(), prepareMealService.getAll(), dietaryRestrictionService.getAll(),
          bowelFunctionService.getAll(), preExistingConditionsService.getAll(), dailyMealService.getAll(),
        ]);
      const catalogs: CustomerFormCatalogs = {
        clinicalPlans: list(clinicalPlans), prepareMeals: list(prepareMeals),
        dietaryRestrictions: list(dietaryRestrictions), bowelFunctions: list(bowelFunctions),
        preExistingConditions: list(preExistingConditions), dailyMeals: list(dailyMeals),
      };
      if (customerId === undefined) return { catalogs, customer: null, associations: EMPTY_ASSOCIATIONS };
      const [customer, associations] = await Promise.all([
        customerService.getById(customerId) as Promise<Customer>,
        fetchAssociations(customerId),
      ]);
      return { catalogs, customer, associations };
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao carregar o formulário'));
    }
  },
);

const tolerant = <T,>(request: Promise<unknown>): Promise<T[]> => request.then((value) => list<T>(value)).catch(() => []);

// O próprio cliente edita o perfil: catálogos e associações que falham aparecem vazios, sem derrubar a tela.
export const loadMyProfile = createAsyncThunk('customerForm/loadMyProfile', async (_: void, { rejectWithValue }) => {
  try {
    const [clinicalPlans, prepareMeals, dietaryRestrictions, bowelFunctions, preExistingConditions, dailyMeals] = await Promise.all([
      tolerant<CatalogOption>(clinicalPlanService.getAll()), tolerant<CatalogOption>(prepareMealService.getAll()),
      tolerant<CatalogOption>(dietaryRestrictionService.getAll()), tolerant<CatalogOption>(bowelFunctionService.getAll()),
      tolerant<CatalogOption>(preExistingConditionsService.getAll()), tolerant<CatalogOption>(dailyMealService.getAll()),
    ]);
    const customer = (await customerService.getMe()) as Customer | null;
    let associations = EMPTY_ASSOCIATIONS;
    if (customer?.id) associations = await fetchAssociations(customer.id).catch(() => EMPTY_ASSOCIATIONS);
    return {
      catalogs: { clinicalPlans, prepareMeals, dietaryRestrictions, bowelFunctions, preExistingConditions, dailyMeals } as CustomerFormCatalogs,
      customer, associations,
    };
  } catch (err) {
    return rejectWithValue(messageOf(err, 'Falha ao carregar o perfil'));
  }
});

const readAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const result = String(reader.result); resolve(result.includes(',') ? result.split(',')[1] : result); };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

interface PhotoResponse {
  signed_url?: string; signedUrl?: string;
  customer?: { photoUrl?: string; photo_url?: string; photoBase64?: string; photo?: string };
}

export const uploadProfilePhoto = createAsyncThunk(
  'customerForm/uploadPhoto',
  async ({ id, file }: { id: number; file: File }, { rejectWithValue }) => {
    try {
      const base64 = await readAsBase64(file);
      const response = (await customerService.uploadPhoto(id, base64, file.name.split('.').pop() || 'jpg', file.type || 'image/jpeg')) as PhotoResponse;
      const c = response?.customer;
      return response?.signed_url || response?.signedUrl || c?.photoUrl || c?.photo_url || c?.photoBase64 || c?.photo || null;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao enviar a foto'));
    }
  },
);

export const saveCustomerForm = createAsyncThunk(
  'customerForm/save',
  async (
    { id, payload, associations }: { id?: number; payload: CustomerPayload; associations: CustomerAssociations },
    { rejectWithValue },
  ) => {
    try {
      const saved = (id === undefined
        ? await customerService.create(payload)
        : await customerService.update(id, payload)) as Customer;
      await syncAssociations(saved.id ?? (id as number), associations);
      return saved;
    } catch (err) {
      return rejectWithValue(messageOf(err, 'Falha ao salvar cliente'));
    }
  },
);

const customerFormSlice = createSlice({
  name: 'customerForm',
  initialState,
  reducers: {
    clearCustomerFormError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomerForm.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.customer = null;
        state.associations = EMPTY_ASSOCIATIONS;
      })
      .addCase(loadCustomerForm.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.catalogs = payload.catalogs;
        state.customer = payload.customer;
        state.associations = payload.associations;
      })
      .addCase(loadCustomerForm.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Erro';
      })
      .addCase(loadMyProfile.pending, (state) => { state.loading = true; state.error = null; state.customer = null; state.associations = EMPTY_ASSOCIATIONS; })
      .addCase(loadMyProfile.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.catalogs = payload.catalogs;
        state.customer = payload.customer;
        state.associations = payload.associations;
      })
      .addCase(loadMyProfile.rejected, (state, action) => { state.loading = false; state.error = (action.payload as string) ?? 'Erro'; })
      .addCase(uploadProfilePhoto.pending, (state) => { state.uploadingPhoto = true; state.error = null; })
      .addCase(uploadProfilePhoto.fulfilled, (state) => { state.uploadingPhoto = false; })
      .addCase(uploadProfilePhoto.rejected, (state, action) => { state.uploadingPhoto = false; state.error = (action.payload as string) ?? 'Erro'; })
      .addCase(saveCustomerForm.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(saveCustomerForm.fulfilled, (state) => { state.saving = false; })
      .addCase(saveCustomerForm.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Erro';
      });
  },
});

export const { clearCustomerFormError } = customerFormSlice.actions;
export default customerFormSlice.reducer;
export type { CustomerFormState };
