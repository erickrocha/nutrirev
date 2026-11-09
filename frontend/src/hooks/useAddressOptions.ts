import { useEffect } from 'react';
import { clearCities, clearProvinces, fetchCities, fetchProvinces } from '../store/addressSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

/** Estados do país e cidades do estado escolhido, sempre em sincronia com os valores do formulário. */
export const useAddressOptions = (countryCode: string, province: string) => {
  const dispatch = useAppDispatch();
  const address = useAppSelector((state) => state.address);

  useEffect(() => {
    if (countryCode.trim().length === 2) dispatch(fetchProvinces(countryCode.trim().toUpperCase()));
    else dispatch(clearProvinces());
  }, [countryCode, dispatch]);

  useEffect(() => {
    const wanted = province.toLowerCase();
    const found = address.provinces.find((item) => item.acronym.toLowerCase() === wanted || item.name.toLowerCase() === wanted);
    if (province && found) dispatch(fetchCities(found.id));
    else dispatch(clearCities());
  }, [province, address.provinces, dispatch]);

  return address;
};
