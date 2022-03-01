import { UnsupportedChainId, UnexpectedAssetTypeError } from '../../sdk/error';
import type {
  AddressesForChainV3,
  ContractAddresses,
  SupportedTokenTypes,
} from '../../sdk/v3/types';
import defaultAddresses from '../../sdk/v3/addresses.json';

const getZeroExAddressesForChain = (
  chainId: number,
  addresses: ContractAddresses = defaultAddresses
): AddressesForChainV3 | undefined => {
  const chainIdString = chainId.toString(10);
  const maybeAddressesForChain: AddressesForChainV3 | undefined = (
    addresses as { [key: string]: AddressesForChainV3 }
  )[chainIdString];
  return maybeAddressesForChain;
};

export const getProxyAddressForErcType = (
  assetType: SupportedTokenTypes,
  chainId: number,
  addresses: ContractAddresses = defaultAddresses
) => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId, addresses);
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

export const getForwarderAddress = (
  chainId: number,
  addresses: ContractAddresses = defaultAddresses
) => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId, addresses);
  if (!zeroExAddresses) {
    throw new UnsupportedChainId(chainId);
  }
  return zeroExAddresses.forwarder;
};

export const getWrappedNativeToken = (
  chainId: number,
  addresses: ContractAddresses = defaultAddresses
): string | null => {
  const zeroExAddresses = getZeroExAddressesForChain(chainId, addresses);
  return zeroExAddresses?.wrappedNativeToken ?? null;
};
