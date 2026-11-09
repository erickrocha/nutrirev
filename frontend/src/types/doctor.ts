export interface Doctor {
  id: number;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  province?: string | null;
  city?: string | null;
  photoBase64?: string | null;
  photoUrl?: string | null;
  // A API já respondeu nos dois formatos; as telas aceitam ambos.
  date_of_birth?: string | null;
  photo_base64?: string | null;
}

export interface DoctorPayload {
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  province: string | null;
  city: string | null;
}
