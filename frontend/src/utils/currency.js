/**
 * Utility functions for currency conversion between integer cents (network/DB)
 * and 2-decimal display strings (UI).
 */

/**
 * Converts integer cents to a 2-decimal string representation.
 * @param {number|null|undefined} cents - Value in cents (e.g. 12345)
 * @returns {string} - Formatted 2-decimal string (e.g. "123.45") or ""
 */
export const centsToDisplay = (cents) => {
  if (cents === null || cents === undefined || cents === '') return '';
  const numCents = typeof cents === 'number' ? cents : parseInt(cents, 10);
  if (isNaN(numCents)) return '';
  return (numCents / 100).toFixed(2);
};

/**
 * Converts a decimal representation or string to integer cents.
 * Rounds to nearest integer to avoid floating point precision drift.
 * @param {number|string|null|undefined} value - Decimal value (e.g. "123.45" or 123.45)
 * @returns {number|null} - Integer cents (e.g. 12345) or null if invalid/empty
 */
export const displayToCents = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(parsed)) return null;
  return Math.round(parsed * 100);
};
