import type { BigNumber } from '@0x/utils';
import type { JsonRpcProvider, Web3Provider } from '@ethersproject/providers';

export interface ObjectMap<T> {
  [key: string]: T;
}

export interface PlainAction<T extends string> {
  type: T;
}

export interface ActionWithPayload<T extends string, P> extends PlainAction<T> {
  data: P;
}

export type FunctionType = (...args: any[]) => any;
export type ActionCreatorsMapObject = ObjectMap<FunctionType>;
export type ActionsUnion<A extends ActionCreatorsMapObject> = ReturnType<
  A[keyof A]
>;

export function createAction<T extends string>(type: T): PlainAction<T>;
export function createAction<T extends string, P>(
  type: T,
  data: P
): ActionWithPayload<T, P>;
export function createAction<T extends string, P>(
  type: T,
  data?: P
): PlainAction<T> | ActionWithPayload<T, P> {
  return data === undefined ? { type } : { type, data };
}

export type BigNumberIsh = BigNumber | string | number;

export type Web3ProviderIsh = Web3Provider;

export type Web3ProviderReadOnlyIsh = JsonRpcProvider;

export type StatePayload<Data, Error> = {
  data?: Data;
  error?: Error;
  isValidating?: boolean;
};
