export interface AddressLike {
  addressLine1?: string | null;
  addressLine2?: string | null;
  locality?: string | null;
  city?: string | null;
  administrativeArea?: string | null;
  province?: string | null;
  postalCode?: string | null;
  zipcode?: string | null;
  countryCode?: string | null;
}

/** "Rua A — Recife, PE — 50000000 · BR"; partes vazias são puladas e, sem nada, vale o `fallback`. */
export const formatAddress = (source: object, fallback = ''): string => {
  const address = source as AddressLike;
  const parts = [address.addressLine1, address.addressLine2].filter(Boolean) as string[];
  const region = [address.locality || address.city, address.administrativeArea || address.province].filter(Boolean).join(', ');
  if (region) parts.push(region);
  const postalCountry = [address.postalCode || address.zipcode, address.countryCode].filter(Boolean).join(' · ');
  if (postalCountry) parts.push(postalCountry);
  return parts.join(' — ') || fallback;
};
