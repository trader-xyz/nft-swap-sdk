export const ERC721_TRANSFER_FROM_DATA = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'enum LibNFTOrder.TradeDirection',
            name: 'direction',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'maker',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'taker',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'expiry',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'contract IERC20TokenV06',
            name: 'erc20Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'erc20TokenAmount',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'recipient',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'bytes',
                name: 'feeData',
                type: 'bytes',
              },
            ],
            internalType: 'struct LibNFTOrder.Fee[]',
            name: 'fees',
            type: 'tuple[]',
          },
          {
            internalType: 'contract IERC721Token',
            name: 'erc721Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'erc721TokenId',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'contract IPropertyValidator',
                name: 'propertyValidator',
                type: 'address',
              },
              {
                internalType: 'bytes',
                name: 'propertyData',
                type: 'bytes',
              },
            ],
            internalType: 'struct LibNFTOrder.Property[]',
            name: 'erc721TokenProperties',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct LibNFTOrder.ERC721Order',
        name: 'order',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'enum LibSignature.SignatureType',
            name: 'signatureType',
            type: 'uint8',
          },
          {
            internalType: 'uint8',
            name: 'v',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'r',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 's',
            type: 'bytes32',
          },
        ],
        internalType: 'struct LibSignature.Signature',
        name: 'signature',
        type: 'tuple',
      },
      {
        name: 'unwrapNativeToken',
        type: 'bool',
      },
    ],
    name: 'safeTransferFromErc721Data',
    outputs: [],
    stateMutability: 'view',
    type: 'function',
  },
];

export const ERC1155_TRANSFER_FROM_DATA = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'enum LibNFTOrder.TradeDirection',
            name: 'direction',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'maker',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'taker',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'expiry',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'contract IERC20TokenV06',
            name: 'erc20Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'erc20TokenAmount',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'address',
                name: 'recipient',
                type: 'address',
              },
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'bytes',
                name: 'feeData',
                type: 'bytes',
              },
            ],
            internalType: 'struct LibNFTOrder.Fee[]',
            name: 'fees',
            type: 'tuple[]',
          },
          {
            internalType: 'contract IERC1155Token',
            name: 'erc1155Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'erc1155TokenId',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'contract IPropertyValidator',
                name: 'propertyValidator',
                type: 'address',
              },
              {
                internalType: 'bytes',
                name: 'propertyData',
                type: 'bytes',
              },
            ],
            internalType: 'struct LibNFTOrder.Property[]',
            name: 'erc1155TokenProperties',
            type: 'tuple[]',
          },
          {
            internalType: 'uint128',
            name: 'erc1155TokenAmount',
            type: 'uint128',
          },
        ],
        internalType: 'struct LibNFTOrder.ERC1155Order[]',
        name: 'sellOrders',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'enum LibSignature.SignatureType',
            name: 'signatureType',
            type: 'uint8',
          },
          {
            internalType: 'uint8',
            name: 'v',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'r',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 's',
            type: 'bytes32',
          },
        ],
        internalType: 'struct LibSignature.Signature',
        name: 'signature',
        type: 'tuple',
      },
      {
        name: 'unwrapNativeToken',
        type: 'bool',
      },
    ],
    name: 'safeTransferFromErc1155Data',
    outputs: [],
    stateMutability: 'view',
    type: 'function',
  },
];
