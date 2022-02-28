---
description: 0x v4 supports configurable royalties and fees.
---

# Royalties and Fee Configuration

0x v4 includes extremely flexible support for fees, both royalties to creators and fees for applications and marketplaces. 0x v4 even includes multiple fee support per order, so you could split fees however you'd like! It's up to you!

NFT marketplaces can now pay royalties in real-time at a lower cost so that creators no longer have to wait days or weeks to get paid. Marketplaces also have the option to send payouts to a contract that implements custom fee disbursement logic.

Fees unlock all sorts of use cases:

* Monetize applications,
* Royalties for creators or DAOs
* Reward user**s**

🔥 **Under 120k gas for a NFT swap with one fee, the cheapest on the EVM** 🔥

### Usage&#x20;

Fees can be specified by:

```ts
interface Fee {
  recipient: string // The address to send the fee to
  amount: string // The amount (based in the same erc20Token) to charge for fee
  feeData?: string | undefined; // optional feeData callback
}
```

Important notes:

* Buyer of the NFT pays the fee(s)
* Fees are in addition to the erc20TokenAmount that the buyer is paying for the NFT itself
* Can support multiple fees

### Example Code Implementing Fees

```typescript
const MAKER_ASSET: SwappableAsset = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

const TAKER_ASSET: SwappableAsset = {
  type: 'ERC20',
  tokenAddress: USDC_TOKEN_ADDRESS,
  amount: '420000000000000', // 4200 USDC
};

const v4Erc721Order = nftSwap.buildOrder(
  MAKER_ASSET,
  TAKER_ASSET,
  MAKER_WALLET_ADDRESS,
  {
    fees: [
      {
        amount: '6900000000000', // 69 USDC fee
        recipient: '0xaaa1388cD71e88Ae3D8432f16bed3c603a58aD34', // your DAO treasury 
      },
    ],
  }
);
```

Docs here: https://0x.org/docs/guides/0x-v4-nft-features-overview#fees

Spec: For each Fee specified in an order, the buyer of the NFT will pay the fee recipient the given amount of ETH/ERC20 tokens. This is in addition to the erc20TokenAmount that the buyer is paying for the NFT itself. There is an optional callback for each fee:
