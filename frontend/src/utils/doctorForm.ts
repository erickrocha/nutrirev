import { maskPhone, onlyDigits } from './format';
import type { Doctor, DoctorPayload } from '../types/doctor';

export interface DoctorFormValues {
  name: string;
  document: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  province: string;
  city: string;
}

export const emptyDoctorForm = (): DoctorFormValues => ({ name: '', document: '', email: '', phone: '', dateOfBirth: '', province: '', city: '' });

export const birthOf = (doctor: Doctor): string => doctor.dateOfBirth || doctor.date_of_birth || '';
export const photoOf = (doctor: Doctor): string | null => doctor.photoBase64 || doctor.photo_base64 || doctor.photoUrl || null;

export const doctorToForm = (doctor: Doctor): DoctorFormValues => ({
  name: doctor.name || '',
  document: doctor.document || '',
  email: doctor.email || '',
  phone: maskPhone(doctor.phone),
  dateOfBirth: birthOf(doctor),
  province: doctor.province || '',
  city: doctor.city || '',
});

/** A máscara do telefone é só de exibição: segue apenas com dígitos. Campos vazios viram null. */
export const toDoctorPayload = (values: DoctorFormValues): DoctorPayload => ({
  name: values.name.trim(),
  document: values.document.trim() || null,
  email: values.email.trim() || null,
  phone: onlyDigits(values.phone) || null,
  dateOfBirth: values.dateOfBirth || null,
  province: values.province || null,
  city: values.city || null,
});

export const matchesDoctorSearch = (doctor: Doctor, term: string): boolean => {
  const needle = term.toLowerCase();
  return (doctor.name || '').toLowerCase().includes(needle) || (doctor.document || '').toLowerCase().includes(needle)
    || (doctor.email || '').toLowerCase().includes(needle) || (doctor.phone || '').includes(term) || (doctor.city || '').toLowerCase().includes(needle);
};
