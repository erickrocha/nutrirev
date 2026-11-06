import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import type { PlanOrderState } from './planOrderSlice';

// O store.js ainda é JS; tipamos só as fatias já migradas.
export interface RootState {
  planOrder: PlanOrderState;
}
export type AppDispatch = ThunkDispatch<RootState, undefined, UnknownAction>;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
