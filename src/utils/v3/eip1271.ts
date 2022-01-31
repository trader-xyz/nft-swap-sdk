export const EIP1271ZeroExDataAbi = [
  {
    inputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'makerAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'takerAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'feeRecipientAddress',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'senderAddress',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'makerAssetAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'takerAssetAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'makerFee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'takerFee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'expirationTimeSeconds',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
          {
            internalType: 'bytes',
            name: 'makerAssetData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'takerAssetData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'makerFeeAssetData',
            type: 'bytes',
          },
          {
            internalType: 'bytes',
            name: 'takerFeeAssetData',
            type: 'bytes',
          },
        ],
        internalType: 'struct IEIP1271Data.Order',
        name: 'order',
        type: 'tuple',
      },
      {
        internalType: 'bytes32',
        name: 'orderHash',
        type: 'bytes32',
      },
    ],
    name: 'OrderWithHash',
    outputs: [],
    stateMutability: 'pure',
    type: 'function',
  },
];
