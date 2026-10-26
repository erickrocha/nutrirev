import { api } from './api';

const createCrudEndpoint = (endpoint) => ({
  async getAll() {
    const response = await api.get(endpoint);
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`${endpoint}/${id}`);
    return response.data;
  },
  async getByUuid(uuid) {
    const response = await api.get(`${endpoint}/uuid/${uuid}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post(endpoint, data);
    return response.data;
  },
  async update(id, data) {
    const response = await api.put(`${endpoint}/${id}`, data);
    return response.data;
  },
  async delete(id) {
    const response = await api.delete(`${endpoint}/${id}`);
    return response.data;
  },
  async importCsv(file, tenantId) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`${endpoint}/import`, formData, {
      params: tenantId ? { tenantId } : undefined,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
});

export const prepareMealService = createCrudEndpoint('/prepare-meal');
export const clinicalPlanService = createCrudEndpoint('/clinical-plan');
export const dietaryRestrictionService = createCrudEndpoint('/dietary-restriction');
export const bowelFunctionService = createCrudEndpoint('/bowel-function');
export const preExistingConditionsService = createCrudEndpoint('/pre-existing-conditions');
export const clinicalConditionsService = createCrudEndpoint('/clinical-conditions');
export const dailyMealService = createCrudEndpoint('/daily-meal');
export const formulaService = createCrudEndpoint('/formula');
export const activityFactorService = createCrudEndpoint('/activity-factor');
export const objectiveService = createCrudEndpoint('/objective');
export const physicalActivityLevelService = createCrudEndpoint('/physical-activity-level');
export const customerGoalSettingService = createCrudEndpoint('/customer-goal-setting');
export const paymentDateService = createCrudEndpoint('/payment-date');

// The generated installments a subscription bills. Read-only from the admin:
// charges are created by the billing worker, never by hand.
export const paymentChargeService = {
  async getByCustomer(customerId) {
    const response = await api.get('/v1/payments/charges', { params: { customerId } });
    return response.data;
  },

  /**
   * Payments the clinic collected and then lost again (refund or chargeback).
   * A reversal puts the charge back on the bill silently, so without this it is
   * indistinguishable from a patient who simply never paid.
   */
  async getReversals() {
    const response = await api.get('/v1/payments/reversals');
    return response.data;
  },
};
/// Which acquirer the clinic uses and which methods it offers.
/// `tenantId` is for the platform operator, which has no clinic of its own and
/// says which one it is supporting. Clinic staff omit it: theirs is the only
/// clinic they may touch, and the server holds them to it.
export const paymentSettingsService = {
  async getConnections(tenantId) {
    const params = tenantId ? { tenantId } : undefined;
    const response = await api.get('/v1/payments/connections', { params });
    return response.data;
  },

  /**
   * Chooses the acquirer and the methods offered through it.
   * One acquirer per clinic: choosing retires the previous one.
   */
  async select({ tenantId, merchantId, creditEnabled, pixEnabled, recurringEnabled }) {
    const response = await api.put('/v1/payments/connections/selected', {
      tenantId: tenantId ?? null,
      merchantId,
      creditEnabled,
      pixEnabled,
      recurringEnabled,
    });
    return response.data;
  },
};

/// The platform operator's side: the lifecycle of a connection, across clinics.
/// Only these responses carry `credentialsSecretRef`; the clinic's list omits it.
export const paymentConnectionAdminService = {
  async list(tenantId) {
    const params = tenantId ? { tenantId } : undefined;
    const response = await api.get('/v1/payments/admin/connections', { params });
    return response.data;
  },

  /// New connections arrive disabled — the clinic still has to choose them.
  async provision({ tenantId, provider, environment, merchantReference, credentialsSecretRef }) {
    const response = await api.post('/v1/payments/connections', {
      tenantId,
      provider,
      environment,
      merchantReference,
      credentialsSecretRef,
    });
    return response.data;
  },

  /// The acquirer is not editable: an attempt records which one took the money.
  async update(id, { merchantReference, credentialsSecretRef, environment }) {
    const response = await api.put(`/v1/payments/admin/connections/${id}`, {
      merchantReference,
      credentialsSecretRef,
      environment,
    });
    return response.data;
  },

  async disable(id) {
    const response = await api.post(`/v1/payments/admin/connections/${id}/disable`);
    return response.data;
  },

  /// Refused by the server once the connection has processed anything.
  async remove(id) {
    await api.delete(`/v1/payments/admin/connections/${id}`);
  },
};

export const mealPointTierService = createCrudEndpoint('/meal-point-tier');

// Join table services
export const customerDietaryRestrictionService = {
  async getAll() {
    const response = await api.get('/customer-dietary-restriction');
    return response.data;
  },
  async getByCustomerId(customerId) {
    const response = await api.get(`/customer-dietary-restriction/customer/${customerId}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/customer-dietary-restriction', data);
    return response.data;
  },
  async delete(customerId, dietaryRestrictionId) {
    const response = await api.delete(`/customer-dietary-restriction/customer/${customerId}/restriction/${dietaryRestrictionId}`);
    return response.data;
  },
};

export const customerBowelFunctionService = {
  async getAll() {
    const response = await api.get('/customer-bowel-function');
    return response.data;
  },
  async getByCustomerId(customerId) {
    const response = await api.get(`/customer-bowel-function/customer/${customerId}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/customer-bowel-function', data);
    return response.data;
  },
  async delete(customerId, bowelFunctionId) {
    const response = await api.delete(`/customer-bowel-function/customer/${customerId}/function/${bowelFunctionId}`);
    return response.data;
  },
};

export const customerPreExistingConditionsService = {
  async getAll() {
    const response = await api.get('/customer-pre-existing-conditions');
    return response.data;
  },
  async getByCustomerId(customerId) {
    const response = await api.get(`/customer-pre-existing-conditions/customer/${customerId}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/customer-pre-existing-conditions', data);
    return response.data;
  },
  async delete(customerId, preExistingConditionsId) {
    const response = await api.delete(`/customer-pre-existing-conditions/customer/${customerId}/condition/${preExistingConditionsId}`);
    return response.data;
  },
};

export const customerDailyMealService = {
  async getAll() {
    const response = await api.get('/customer-daily-meal');
    return response.data;
  },
  async getByCustomerId(customerId) {
    const response = await api.get(`/customer-daily-meal/customer/${customerId}`);
    return response.data;
  },
  async create(data) {
    const response = await api.post('/customer-daily-meal', data);
    return response.data;
  },
  async delete(customerId, dailyMealId) {
    const response = await api.delete(`/customer-daily-meal/customer/${customerId}/meal/${dailyMealId}`);
    return response.data;
  },
};

export const provinceService = {
  async getAll(countryCode) {
    const response = await api.get('/province', { params: { countryCode } });
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/province/${id}`);
    return response.data;
  },
};

export const cityService = {
  async getAll() {
    const response = await api.get('/city');
    return response.data;
  },
  async getByProvinceId(provinceId) {
    const response = await api.get(`/city/by-province/${provinceId}`);
    return response.data;
  },
  async getById(id) {
    const response = await api.get(`/city/${id}`);
    return response.data;
  },
};
