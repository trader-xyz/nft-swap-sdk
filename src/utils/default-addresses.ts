import { UnsupportedChainId, UnexpectedAssetTypeError } from '../sdk/error';
import type { AddressesForChain, SupportedTokenTypes } from '../sdk/v3/types';
import addresses from '../addresses.json';

const getZeroExAddressesForChain = (
  chainId: number
): AddressesForChain | undefined => {
  const chainIdString = chainId.toString(10);
  const maybeAddressesForChain: AddressesForChain | undefined = (
    addresses as { [key: string]: AddressesForChain }
  )[chainIdString];
  return maybeAddressesForChain;
};

export const getProxyAddressForErcType = (
  assetType: SupportedTokenTypes,
  chainId: number
) => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId);
  if (!zeroExAddresses) {
    throw new UnsupportedChainId(chainId);
  }
  switch (assetType) {
    case 'ERC20':
      return zeroExAddresses.erc20Proxy;
    case 'ERC721':
      return zeroExAddresses.erc721Proxy;
    case 'ERC1155':
      return zeroExAddresses.erc1155Proxy;
    default:
      throw new UnexpectedAssetTypeError(assetType);
  }
};

export const getForwarderAddress = (chainId: number) => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId);
  if (!zeroExAddresses) {
    throw new UnsupportedChainId(chainId);
  }
  return zeroExAddresses.forwarder;
};

export const getWrappedNativeToken = (chainId: number): string | null => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId);
  return zeroExAddresses?.wrappedNativeToken ?? null;
};
