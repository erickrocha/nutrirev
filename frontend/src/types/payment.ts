export interface MyCharge {
  id: number;
  status: 'open' | 'overdue' | 'paid' | 'cancelled' | string;
  sequence?: number;
  dueDate?: string;
  paidAt?: string | null;
  amountCents: number;
  paymentDateId?: number | null;
  payment_date_id?: number | null;
}

export interface OfferedMethods {
  credit: boolean;
  pix: boolean;
  recurring: boolean;
}

export interface PixCharge {
  attemptId: number;
  payload: string;
  encodedImage?: string | null;
  expiresAt?: string | null;
}

export interface PixAttemptState {
  chargePaid?: boolean;
  status?: string;
}

export interface CardData {
  cardholderName: string;
  cardNumber: string;
  expirationMonth: number;
  expirationYear: number;
  securityCode: string;
}

/** O que o pagamento no cartão devolve à tela; a tela escolhe o texto traduzido. */
export type CardOutcome =
  | { kind: 'approved'; recurrenceFailed: boolean; taxIdRequired: boolean }
  | { kind: 'uncertain' }
  | { kind: 'declined' }
  | { kind: 'taxIdRequired' }
  | { kind: 'error'; message: string };
