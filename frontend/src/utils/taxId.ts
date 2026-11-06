import { onlyDigits } from './format';

// Mesma regra do backend (domain/tax_id.rs): dígitos verificadores, sem repetidos (111...).
const checkDigit = (digits: number[], weights: number[]): number => {
  const sum = digits.reduce((acc, digit, i) => acc + digit * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
};

const CPF_W1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const CPF_W2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_W1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_W2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

const validWithWeights = (digits: number[], w1: number[], w2: number[]): boolean => {
  const base = digits.length - 2;
  return checkDigit(digits.slice(0, base), w1) === digits[base] && checkDigit(digits.slice(0, base + 1), w2) === digits[base + 1];
};

export const isValidTaxId = (value: unknown): boolean => {
  const digits = onlyDigits(value).split('').map(Number);
  if (digits.length !== 11 && digits.length !== 14) return false;
  if (digits.every((d) => d === digits[0])) return false;
  return digits.length === 11 ? validWithWeights(digits, CPF_W1, CPF_W2) : validWithWeights(digits, CNPJ_W1, CNPJ_W2);
};
