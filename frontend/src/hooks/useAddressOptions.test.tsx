import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { ReactNode } from 'react';
import { makeStore } from '../test/render';
import { useAddressOptions } from './useAddressOptions';
import { cityService, provinceService } from '../services/clinicalService';

afterEach(() => vi.restoreAllMocks());

const setup = (country: string, province: string) => {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return renderHook(({ c, p }) => useAddressOptions(c, p), { wrapper, initialProps: { c: country, p: province } });
};

describe('useAddressOptions', () => {
  it('carrega os estados do país e as cidades do estado escolhido', async () => {
    vi.spyOn(provinceService, 'getAll').mockResolvedValue([{ id: 26, acronym: 'PE', name: 'Pernambuco' }]);
    const cities = vi.spyOn(cityService, 'getByProvinceId').mockResolvedValue([{ name: 'Recife' }]);
    const { result } = setup('br', 'pe');
    await waitFor(() => expect(result.current.cities).toEqual([{ name: 'Recife' }]));
    expect(provinceService.getAll).toHaveBeenCalledWith('BR');
    expect(cities).toHaveBeenCalledWith(26);
  });

  it('país incompleto limpa os estados e não consulta a API', () => {
    const provinces = vi.spyOn(provinceService, 'getAll');
    const { result } = setup('B', '');
    expect(provinces).not.toHaveBeenCalled();
    expect(result.current.provinces).toEqual([]);
  });

  it('estado desconhecido deixa as cidades vazias', async () => {
    vi.spyOn(provinceService, 'getAll').mockResolvedValue([{ id: 1, acronym: 'SP', name: 'São Paulo' }]);
    const cities = vi.spyOn(cityService, 'getByProvinceId');
    const { result } = setup('BR', 'ZZ');
    await waitFor(() => expect(result.current.provinces).toHaveLength(1));
    expect(cities).not.toHaveBeenCalled();
    expect(result.current.cities).toEqual([]);
  });
});
