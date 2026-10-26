import { api } from './api';

export const paymentService = {
  /**
   * Fetch the signed-in patient's own billing charges.
   * The backend resolves the customer from the token.
   */
  async getMyCharges() {
    const response = await api.get('/v1/payments/charges');
    return response.data;
  },

  /**
   * Fetch billing charges for a specific customer (clinical / tenant staff).
   */
  async getByCustomer(customerId) {
    const response = await api.get('/v1/payments/charges', { params: { customerId } });
    return response.data;
  },

  /**
   * Reserves an attempt against a charge.
   * @param {Object} params
   * @param {number} params.chargeId
   * @param {string} params.idempotencyKey - 16-64 chars key to prevent double charging on retry
   * @param {string} [params.method='credit']
   * @param {number} [params.installments=1]
   */
  async prepare({ chargeId, idempotencyKey, method = 'credit', installments = 1 }) {
    const response = await api.post(`/v1/payments/charges/${chargeId}/prepare`, {
      idempotencyKey,
      method,
      installments,
    });
    return response.data;
  },

  /**
   * Issues a Pix charge and returns the BR Code plus a QR image.
   * Reserves the attempt and calls the provider in one round trip.
   * @param {Object} params
   * @param {number} params.chargeId
   * @param {string} params.idempotencyKey - stable across retries of this checkout
   */
  async createPixCharge({ chargeId, idempotencyKey, taxId }) {
    const response = await api.post(`/v1/payments/charges/${chargeId}/pix`, {
      idempotencyKey,
      taxId: taxId || null,
    });
    return response.data;
  },

  /**
   * Current state of an attempt. Polled while a Pix QR is on screen, because a
   * webhook can be late and the customer must not be left staring at a paid QR.
   */
  async getAttempt(attemptId) {
    const response = await api.get(`/v1/payments/attempts/${attemptId}`);
    return response.data;
  },

  /**
   * Releases an attempt that is still waiting.
   * Only one live attempt may reserve a charge, so an abandoned Pix QR has to be
   * cancelled or the charge cannot be paid by any method afterwards.
   */
  async cancelAttempt(attemptId) {
    const response = await api.post(`/v1/payments/attempts/${attemptId}/cancel`);
    return response.data;
  },

  /**
   * Submits card details to authorize a prepared attempt.
   * Card data is sent once and never persisted locally.
   * @param {Object} params
   * @param {number} params.attemptId
   * @param {string} params.cardholderName
   * @param {string} params.cardNumber
   * @param {number} params.expirationMonth
   * @param {number} params.expirationYear
   * @param {string} params.securityCode
   */
  async authorize({
    attemptId,
    cardholderName,
    cardNumber,
    expirationMonth,
    expirationYear,
    securityCode,
  }) {
    const response = await api.post(`/v1/card-payments/${attemptId}/authorize`, {
      cardholderName,
      cardNumber,
      expirationMonth,
      expirationYear,
      securityCode,
    });
    return response.data;
  },

  /**
   * Stores the card and switches the subscription to automatic billing.
   * Card data is sent once and never persisted locally; only the provider's
   * token is kept, server-side.
   */
  async enableRecurring({ subscriptionId, cardholderName, cardNumber, expirationMonth, expirationYear, securityCode, taxId }) {
    const response = await api.post(`/v1/payments/subscriptions/${subscriptionId}/card`, {
      taxId: taxId || null,
      cardholderName,
      cardNumber,
      expirationMonth,
      expirationYear,
      securityCode,
    });
    return response.data;
  },

  /** Turns automatic billing off and revokes the stored card. */
  async disableRecurring(subscriptionId) {
    const response = await api.delete(`/v1/payments/subscriptions/${subscriptionId}/card`);
    return response.data;
  },

  /** How a subscription is currently paid, and which card is on file. */
  async getBillingMode(subscriptionId) {
    const response = await api.get(`/v1/payments/subscriptions/${subscriptionId}/billing`);
    return response.data;
  },

  /**
   * What this clinic accepts. The checkout offers only these, so a patient is
   * never shown a method that would be refused at the reservation.
   */
  async getOfferedMethods() {
    const response = await api.get('/v1/payments/methods');
    return response.data;
  },
};
