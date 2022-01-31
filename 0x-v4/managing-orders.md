# Managing Orders

### Building Orders

There are two ways to build orders wit the 0x v4 Swap SDK, **`buildOrder`** and **`buildNftAndErc20Order`**&#x20;

#### \`buildOrder(makerAsset: NFT | ERC20, takerAsset: NFT | ERC20, makerAddress)\`

**`buildOrder()`** accepts the traditional order format (specifying maker and taker assets).&#x20;

```typescript
import { NftSwapV4 } from '@traderxyz/nft-swap-sdk';

const nftSwapSdk = new NftSwapV4(provider, signer, chainId);

const CRYPTOPUNK_420 = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb', // CryptoPunk contract address
  tokenId: '420', // Token Id of the CryptoPunk we want to swap
  type: 'ERC721', // Must be one of 'ERC20', 'ERC721', or 'ERC1155'
};

const SIXTY_NINE_USDC = {
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract address
  amount: '69000000', // 69 USDC (USDC is 6 digits)
  type: 'ERC20',
};

const walletAddressUserA = '0x1eeD19957E0a81AED9a80f09a3CCEaD83Ea6D86b';

const order = nftSwapSdk.buildOrder(
  nftToSwapUserA,
  usdcToSwapUserB,
  walletAddressUserA
);

```

**`buildNftAndErc20Order()`** accepts the new order format, where you specify an nft, an erc20 and a sell direction ('sell' if the maker of the trade is selling the nft, 'buy' if the maker of the trade is buying the nft)

```typescript
const order = nftSwapSdk.buildNftAndErc20Order(
  nftToSwapUserA,
  usdcToSwapUserB,
  'sell',
  walletAddressUserA
);
```

### Approving Orders

Approvals are required to move tokens and NFTs to and from accounts, and in general to fill orders. Before executing a trade, both parties will need to have approved the 0x v4 Exchange Contract.

To approve an asset, call the `approveTokenOrNftByAsset` function.

Pass it the NFT or ERC20 you need to approve&#x20;

```typescript
const CRYPTOPUNK = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '69',
  type: 'ERC721', // Must be one of 'ERC20', 'ERC721', or 'ERC1155'
};

await nftSwapSdk.approveTokenOrNftByAsset(CRYPTOPUNK, walletAddressMaker);
```

### Signing Orders

Once you've built an order, for it to be valid (and for it to be able to be filled by someone) it needs to be signed. The maker of the order signs the order, and the taker will fill the signed order.

After building an order via `buildOrder` or `buildNftAndErc20Order` dpass the order object to the `signOrder` function to sign and confirm your order. Once signed, this order is active and can be filled as long as it is valid.

```typescript
const signedOrder = await nftSwapSdk.signOrder(order);
```

### Cancelling Orders

To cancel an order, call the `cancelOrder` function on the Swap SDK and pass it the order:

```typescript
await nftSwapSdk.cancelOrder(signedOrder);
```

#### Advanced Cancellations

Being able to cancel by nonce allows us to do some cool things with regard to order cancellations.

Documentation coming soon

### Saving Orders

#### Orderbook / Order Persistance&#x20;

**Swap SDK offers integrators their own free, publicly hosted orderbook to use for their application.** This allows developers to persist orders off-chain without having to manage any additional infrastructure. Leverage the power of off-chain orders without any of the work!&#x20;

Docs coming soon, hop in to discord to test drive your own free off-chain orderbook today.

Developers can always bring their own orderbook/order persistance infrastructure if they'd prefer.

