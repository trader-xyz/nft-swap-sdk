---
description: Buy multiple NFTs in a single transaction.
---

# Batch Buy NFTs

NFT Swap SDK supports buying multiple NFTs in an a single atomic transaction using 0x v4.

This can be useful if you're building a shopping-cart feature for your users. A user can select multiple NFTs they would like to purchase, and when they are ready to purchase, call the `batchBuyNfts` method to checkout.

### Usage&#x20;

To use the batch fill feature, pass in an array of signed orders you want the taker to fill.&#x20;

```typescript
const fillTx = await nftSwap.batchBuyNfts([
  signedOrder_1,
  signedOrder_2,
])
```

#### Available batch fill options:

`revertIfIncomplete`: (boolean) Revert the transaction if only some (but not all) of the orders are filled. When set to `true` this is the equivalent of a `fillOrKill` type of order. Defaults to false.&#x20;

* Example: If only four of five provided orders are filled (the fifth one expired or was filled by someone else previously), this allows you to revert or continue with the transaction.



### Limitation

There are a limitations to be aware of when using the `batchBuyNfts` function

* Array of signed orders must be either all ERC721s or ERC1155s. They cannot be a mix of \[ERC721, ERC1155]. This is a constraint at the smart contract level.

Also, keep in mind this is only for NFT sell orders (i.e. the taker is buying NFTs). As such, only pass the `batchBuyNfts` NFT sell orders.&#x20;
