---
description: >-
  Trader offers a free publicly hosted orderbook to manage your 0x v4 orders
  automatically. The orderbook handles order status, order fills
---

# Hosted Orderbook

### Post an order:

To post an order to the Trader orderbook, use the SDK as follows:

```typescript
	
const order = nftSdk.buildOrder(
  // I am offering an NFT (CryptoCoven #9757)
  {
    type: "ERC721",
    tokenAddress: "0x5180db8f5c931aae63c74266b211f580155ecac8",
    tokenId: "9757",
  },
  // I will receive an ERC20 (5,000 of USDC)
  {
    type: "ERC20",
    tokenAddress: "0x31f42841c2db5173425b5223809cf3a38fede360",
    amount: "500000000000000", // 5000 USDC (5000 * 6 decimals)
  },
  // My wallet address
  "0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b"
);
 
const signedOrder = await nftSdk.signOrder(order);
 
const postedOrder = await nftSdk.postOrder(signedOrder, CHAIN_ID);
```

### Fetching Orders

```typescript
// Search the orderbook for all offers to sell this NFT (CryptoCoven #9757)
const orders = await nftSwap.getOrders({
  nftToken: "0x5180db8f5c931aae63c74266b211f580155ecac8",
  nftTokenId: "9757",
  chainId: "3",
});
 
// Or search by unique nonce
const orders = await nftSwap.getOrders({
  nonce: "0x31f42841c2db5173425b5223809cf3a38fede360",
});
 
const foundOrder = orders[0];
// Once you find an order, you can then fill it

await nftSwap.fillSignedOrder(foundOrder.order);
```

### Monitoring Orderbook Status

The status page for the orderbook can be found here: https://status.trader.xyz
