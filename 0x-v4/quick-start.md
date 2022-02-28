---
description: Get started integrating the Swap SDK into your app
---

# Quick Start

### Installation

You can install the SDK with yarn:

`yarn add @traderxyz/nft-swap-sdk`

or npm:

`npm install @traderxyz/nft-swap-sdk`

### Configuration

To use the SDK, create a new `NftSwapV4` instance.

```tsx
import { NftSwapV4 } from '@traderxyz/nft-swap-sdk';

// Supply a provider, signer, and chain id to get started
// Signer is optional if you only need read-only methods
const nftSwapSdk = new NftSwapV4(provider, signer, chainId);
```

Note: 0x v4 contracts with NFT support are currently only live on Mainnet and Ropsten.&#x20;

Polygon, Optimism, Aribtrum, BSC, Fantom, and Celo will be supported very soon.&#x20;

### Quick Start

Let's walk through the most common NFT swap case: swapping an NFT (ERC721 or ERC1155) with an ERC20.&#x20;

#### Swap an NFT with an ERC20

```typescript
import { NftSwapV4 } from '@traderxyz/nft-swap-sdk';

// Scenario: User A wants to sell their CryptoPunk for 420 WETH 

// Set up the assets we want to swap (CryptoPunk #69 and 420 WETH)
const CRYPTOPUNK = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '69',
  type: 'ERC721', // 'ERC721' or 'ERC1155'
};
const FOUR_HUNDRED_TWENTY_WETH = {
  tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', // WETH contract address
  amount: '420000000000000000000', // 420 Wrapped-ETH (WETH is 18 digits)
  type: 'ERC20',
};

// [Part 1: Maker (owner of the Punk) creates trade]
const nftSwapSdk = new NftSwapV4(provider, signerForMaker, CHAIN_ID);
const walletAddressMaker = '0x1234...';

// Approve NFT to trade (if required)
await nftSwapSdk.approveTokenOrNftByAsset(CRYPTOPUNK, walletAddressMaker);

// Build order
const order = nftSwapSdk.buildOrder(
  CRYPTOPUNK, // Maker asset to swap
  FOUR_HUNDRED_TWENTY_WETH, // Taker asset to swap
  walletAddressMaker
);
// Sign order so order is now fillable
const signedOrder = await nftSwapSdk.signOrder(order, takerAddress);

// [Part 2: Taker that wants to buy the punk fills trade]
const nftSwapSdk = new NftSwap(provider, signerForTaker, CHAIN_ID);
const walletAddressTaker = '0x9876...';

// Approve USDC to trade (if required)
await nftSwapSdk.approveTokenOrNftByAsset(FOUR_HUNDRED_TWENTY_WETH, walletAddressTaker);

// Fill order :)
const fillTx = await nftSwapSdk.fillSignedOrder(signedOrder);
const fillTxReceipt = await nftSwapSdk.awaitTransactionHash(fillTx.hash);
console.log(`🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`);
```

That's it! More examples and advanced usage can be found in the examples documentation.&#x20;

Happy swapping! :tada: :handshake:
