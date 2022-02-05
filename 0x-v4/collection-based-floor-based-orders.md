---
description: >-
  NFT Swap SDK supports Collection-based orders. Allows users to bid on any NFT
  from a specified collection.
---

# Collection-based/Floor-based orders

Makers can create bids (orders) for any NFT from a specific collection.

#### Use Case Example

Let's say a user wants to buy _any_ Bored Ape and they don't care which specific Ape they get. The user simply signs a collection order (shown below) agreeing to buy an NFT from the collection for a specified amount of an ERC20 token.&#x20;

#### Example Code:

Create collection-based or floor-based orders easily:

```typescript
// Maker creates an order for any NFT from a collection (you can think of it as a 'bid')
// Specifically in this example, the maker will sell 1000 USDC for any NFT in the collection specificed
const v4Erc721Order = nftSwapperMaker.buildCollectionBasedOrder(
  // Selling ERC20
  {
    type: "ERC20",
    tokenAddress: USDC_TOKEN_ADDRESS,
    amount: "100000000000000", // 1000 USDC
  },
  // Bidding on NFT in the collection, just specify the contract address and whether its an ERC721 or ERC1155.
  {
    tokenAddress: NFT_CONTRACT_ADDDRESS,
    type: "ERC721",
  },
  makerWalletAddress // Maker wallet address
)

const signedOrder = await nftSwapperMaker.signOrder(v4Erc721Order)

// Later, taker can sell an NFT from the specified collection, filling the bid.
const fillTx = await nftSwapperMaker.fillSignedCollectionOrder(
  signedOrder,
  "11045" // Token ID from the collection to fill order with
)
```
