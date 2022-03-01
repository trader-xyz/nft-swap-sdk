export const EIP712_DOMAIN_PARAMETERS = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

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

export const FEE_ABI = [
  { type: 'address', name: 'recipient' },
  { type: 'uint256', name: 'amount' },
  { type: 'bytes', name: 'feeData' },
];

export const PROPERTY_ABI = [
  { type: 'address', name: 'propertyValidator' },
  { type: 'bytes', name: 'propertyData' },
];

export const ERC721STRUCT_NAME = 'ERC721Order';
