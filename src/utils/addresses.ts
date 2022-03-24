import { SupportedChainIdsV4 } from '../sdk';
import defaultAddresses from '../sdk/v4/addresses.json';

export const getWrappedNativeToken = (
  chainId: number | string
): string | null => {
  const chainIdString = chainId.toString(10);
  const zeroExAddresses:
    | { exchange: string; wrappedNativeToken: string }
    | undefined =
    defaultAddresses[chainIdString as unknown as SupportedChainIdsV4];
  return zeroExAddresses?.wrappedNativeToken ?? null;
};
