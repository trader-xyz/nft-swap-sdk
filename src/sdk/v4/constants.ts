export const EIP712_DOMAIN_PARAMETERS = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

export const ERC721ORDER_STRUCT_NAME = 'ERC721Order';

export const ERC721ORDER_STRUCT_ABI = [
  { type: 'uint8', name: 'direction' },
  { type: 'address', name: 'maker' },
  { type: 'address', name: 'taker' },
  { type: 'uint256', name: 'expiry' },
  { type: 'uint256', name: 'nonce' },
  { type: 'address', name: 'erc20Token' },
  { type: 'uint256', name: 'erc20TokenAmount' },
  { type: 'Fee[]', name: 'fees' },
  { type: 'address', name: 'erc721Token' },
  { type: 'uint256', name: 'erc721TokenId' },
  { type: 'Property[]', name: 'erc721TokenProperties' },
];

export const EIP1155_DOMAIN_PARAMETERS = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

export const ERC1155ORDER_STRUCT_NAME = 'ERC1155Order';
export const ERC1155ORDER_STRUCT_ABI = [
  { type: 'uint8', name: 'direction' },
  { type: 'address', name: 'maker' },
  { type: 'address', name: 'taker' },
  { type: 'uint256', name: 'expiry' },
  { type: 'uint256', name: 'nonce' },
  { type: 'address', name: 'erc20Token' },
  { type: 'uint256', name: 'erc20TokenAmount' },
  { type: 'Fee[]', name: 'fees' },
  { type: 'address', name: 'erc1155Token' },
  { type: 'uint256', name: 'erc1155TokenId' },
  { type: 'Property[]', name: 'erc1155TokenProperties' },
  { type: 'uint128', name: 'erc1155TokenAmount' },
];

export const FEE_ABI = [
  { type: 'address', name: 'recipient' },
  { type: 'uint256', name: 'amount' },
  { type: 'bytes', name: 'feeData' },
];

export const PROPERTY_ABI = [
  { type: 'address', name: 'propertyValidator' },
  { type: 'bytes', name: 'propertyData' },
];

export const ETH_ADDRESS_AS_ERC20 =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const NATIVE_TOKEN_ADDRESS_AS_ERC20 =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

// https://github.com/0xProject/protocol/blob/refactor/nft-orders/contracts/zero-ex/contracts/src/features/libs/LibSignature.sol#L42-L61
export const PRESIGNED_SIGNATURE = {
  signatureType: 4, // Presigned id
  v: 0,
  r: '0',
  s: '0',
};
