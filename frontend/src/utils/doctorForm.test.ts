import { doctorToForm, emptyDoctorForm, matchesDoctorSearch, photoOf, toDoctorPayload } from './doctorForm';

describe('doctorForm', () => {
  it('carrega o médico com telefone mascarado e aceita os campos alternativos da API', () => {
    expect(doctorToForm({ id: 1, name: 'Dr. A', phone: '11987654321', date_of_birth: '1980-02-01', province: 'SP' }))
      .toMatchObject({ phone: '(11) 98765-4321', dateOfBirth: '1980-02-01', province: 'SP', document: '' });
    expect(photoOf({ id: 1, name: 'x', photo_base64: 'abc' })).toBe('abc');
    expect(photoOf({ id: 1, name: 'x' })).toBeNull();
  });

  it('envia o telefone só com dígitos e null nos campos vazios', () => {
    const payload = toDoctorPayload({ ...emptyDoctorForm(), name: ' Dr. A ', phone: '(11) 98765-4321', document: ' CRM/SP 1 ' });
    expect(payload).toEqual({ name: 'Dr. A', document: 'CRM/SP 1', email: null, phone: '11987654321', dateOfBirth: null, province: null, city: null });
  });

  it('busca por nome, CRM, e-mail, telefone ou cidade', () => {
    const doctor = { id: 1, name: 'Carlos', document: 'CRM 99', email: 'c@x.com', phone: '1198', city: 'Recife' };
    expect(['carl', 'crm 9', 'X.COM', '1198', 'recife', 'zzz'].map((term) => matchesDoctorSearch(doctor, term))).toEqual([true, true, true, true, true, false]);
  });
});
