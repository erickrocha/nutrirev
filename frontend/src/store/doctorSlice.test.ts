import { configureStore } from '@reduxjs/toolkit';
import reducer, { deleteDoctor, fetchDoctors, saveDoctor } from './doctorSlice';
import { doctorService } from '../services/doctorService';

const makeStore = () => configureStore({ reducer: { doctor: reducer } });
const payload = { name: 'Dr. A', document: null, email: null, phone: null, dateOfBirth: null, province: null, city: null };
afterEach(() => vi.restoreAllMocks());

describe('doctorSlice', () => {
  it('lista os médicos; resposta inválida vira lista vazia; falha guarda a mensagem', async () => {
    vi.spyOn(doctorService, 'getAll').mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce(null).mockRejectedValueOnce({ response: { data: { message: 'boom' } } });
    const store = makeStore();
    await store.dispatch(fetchDoctors());
    expect(store.getState().doctor.doctors).toEqual([{ id: 1 }]);
    await store.dispatch(fetchDoctors());
    expect(store.getState().doctor.doctors).toEqual([]);
    await store.dispatch(fetchDoctors());
    expect(store.getState().doctor.error).toBe('boom');
  });

  it('cria sem id, atualiza com id e registra a falha', async () => {
    const create = vi.spyOn(doctorService, 'create').mockResolvedValue({});
    const update = vi.spyOn(doctorService, 'update').mockRejectedValue({ response: { data: { message: 'CRM duplicado' } } });
    const store = makeStore();
    await store.dispatch(saveDoctor({ payload }));
    await store.dispatch(saveDoctor({ id: 4, payload }));
    expect(create).toHaveBeenCalledWith(payload);
    expect(update).toHaveBeenCalledWith(4, payload);
    expect(store.getState().doctor).toMatchObject({ error: 'CRM duplicado', saving: false });
  });

  it('exclui e recarrega; falha guarda o erro e não recarrega', async () => {
    const remove = vi.spyOn(doctorService, 'delete').mockRejectedValueOnce({}).mockResolvedValueOnce({});
    const list = vi.spyOn(doctorService, 'getAll').mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch(deleteDoctor(1));
    expect(store.getState().doctor.error).toBe('');
    expect(list).not.toHaveBeenCalled();
    await store.dispatch(deleteDoctor(1));
    expect(remove).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenCalledTimes(1);
  });
});
