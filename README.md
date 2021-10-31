# NFT Swap SDK

Description here

## Examples

### Example 1: NFT <> NFT swap

In this first example, we're going to do a 1:1 NFT swap. We're going to swap User A's CryptoPunk NFT for User B's Bored Ape NFT.

> Since User A will initiate the trade, we'll refer to User A as the `maker` of the trade.

> Since User B will be filling and completing the trade created by User A, we'll call User B the `taker` of the trade.

```tsx
const CHAIN_ID = 1; // Mainnet

const CRYPTOPUNK_420: SwappableAsset = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '420',
  type: 'ERC721',
};

const BORED_APE_69: SwappableAsset = {
  tokenAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  tokenId: '69',
  type: 'ERC720',
};

// User A Trade Data
const walletAddressUserA = '0x1eeD19957E0a81AED9a80f09a3CCEaD83Ea6D86b';
const assetsToSwapUserA = [CRYPTOPUNK_420];

// User B Trade Data
const walletAddressUserB = '0x44beA2b43600eE240AB6Cb90696048CeF32aBf1D';
const assetsToSwapUserB = [BORED_APE_69];

// ............................
// Part 1 of the trade -- User A (the 'maker') initiates an order
// ............................

// Initiate the SDK for User A.
// Pass the user's wallet signer (available via the user's wallet provider) to the Swap SDK
const nftSwapSdk = new NftSwap(signerUserA, CHAIN_ID);

// Check if we need to approve the NFT for swapping
const approvalStatusForUserA = await nftSwapSdk.loadApprovalStatus(
  assetsToSwapUserA[0],
  walletAddressUserA
);
// If we do need to approve User A's CryptoPunk for swapping, let's do that now
if (!approvalStatusForUserA.contractApproved) {
  const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
    assetsToSwapUserA[0],
    makerAddress
  );
  const approvalTxReceipt = await approvalTx.wait();
  console.log(
    `Approved ${assetsToSwapUserA[0].tokenAddress} contract to swap with 0x (txHash: ${approvalTxReceipt.transactionHash})`
  );
}

// Create the order (Remember, User A initiates the trade, so User A creates the order)
const order = nftSwapSdk.buildOrder(
  assetsToSwapUserA,
  assetsToSwapUserB,
  walletAddressUserA
);
// Sign the order (User A signs since they are initiating the trade)
const signedOrder = await nftSwapSdk.signOrder(order, takerAddress);
// Part 1 Complete. User A is now done. Now we send the `signedOrder` to User B to complete the trade.

// ............................
// Part 2 of the trade -- User B (the 'taker') accepts and fills order from User A and completes trade
// ............................
// Initiate the SDK for User B.
// Pass the user's wallet signer (available via the user's wallet provider) to the Swap SDK
const nftSwapSdk = new NftSwap(signerUserB, CHAIN_ID);

// Check if we need to approve the NFT for swapping
const approvalStatusForUserB = await nftSwapSdk.loadApprovalStatus(
  assetsToSwapUserB[0],
  walletAddressUserB
);
// If we do need to approve NFT for swapping, let's do that now
if (!approvalStatusForUserB.contractApproved) {
  const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
    assetsToSwapUserB[0],
    walletAddressUserB
  );
  const approvalTxReceipt = await approvalTx.wait();
  console.log(
    `Approved ${assetsToSwapUserB[0].tokenAddress} contract to swap with 0x. TxHash: ${approvalTxReceipt.transactionHash})`
  );
}
// The final step is the taker (User B) submitting the order.
// The taker approves the trade transaction and it will be submitted on the blockchain for settlement.
// Once the transaction is confirmed, the trade will be settled and cannot be reversed.
const fillTx = await nftSwapSdk.fillSignedOrder(signedOrder);
const fillTxReceipt = await await nftSwapSdk.awaitTransactionHash(fillTx);
console.log(`🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`);
```

### Example 2: Kitchen Sink -- Bundle <> Bundle swap

Here we show an example of what the swap library is capable of. We can swap arbitrary ERC's in bundles. Meaning, we can swap `[ERC721, ERC1155, ERC20] <> [ERC721, ERC1155, ERC20]`. There's really no limit to what we can swap.

More concrete example: We can swap `[2 CryptoPunks, 1,000 DAI] <> [1 WETH, 694,200 USDC]`. In this case we'd be swapping an `ERC721` and an `ERC20` (Punk, DAI) for `two ERC20s` (WETH, USDC). This is just one example. In reality, you can swap as many things as you'd like, any way you'd like. The underlying 0x protocol is extremely flexible, and the NFT swap library abstracts all the complexity away for you!.

```tsx
const CHAIN_ID = 1; // Mainnet

const CRYPTOPUNK_420: SwappableAsset = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '420',
  type: 'ERC721',
};

const CRYPTOPUNK_421: SwappableAsset = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '421',
  type: 'ERC721',
};

const DAI: SwappableAsset = {
  tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
  amount: '1000000000000000000', // 1 DAI (DAI is 18 digits)
  type: 'ERC20',
};

const USDC: SwappableAsset = {
  tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  amount: '1000000', // 1 USDC (USDC is 6 digits)
  type: 'ERC20',
};

const WETH: SwappableAsset = {
  tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f',
  amount: '1000000000000000000', // 1 DAI (DAI is 18 digits)
  type: 'ERC20',
};

// User A Trade Data
const walletAddressUserA = '0x1eeD19957E0a81AED9a80f09a3CCEaD83Ea6D86b';
const assetsToSwapUserA = [CRYPTOPUNK_420];

// User B Trade Data
const walletAddressUserB = '0x44beA2b43600eE240AB6Cb90696048CeF32aBf1D';
const assetsToSwapUserB = [BORED_APE_69];

// ............................
// Part 1 of the trade -- User A (the 'maker') initiates an order
// ............................

// Initiate the SDK for User A.
// Pass the user's wallet signer (available via the user's wallet provider) to the Swap SDK
const nftSwapSdk = new NftSwap(signerUserA, CHAIN_ID);

// Check if we need to approve the NFT for swapping
const approvalStatusForUserA = await nftSwapSdk.loadApprovalStatus(
  assetsToSwapUserA[0],
  walletAddressUserA
);
// If we do need to approve User A's CryptoPunk for swapping, let's do that now
if (!approvalStatusForUserA.contractApproved) {
  const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
    assetsToSwapUserA[0],
    makerAddress
  );
  const approvalTxReceipt = await approvalTx.wait();
  console.log(
    `Approved ${assetsToSwapUserA[0].tokenAddress} contract to swap with 0x (txHash: ${approvalTxReceipt.transactionHash})`
  );
}

// Create the order (Remember, User A initiates the trade, so User A creates the order)
const order = nftSwapSdk.buildOrder(
  assetsToSwapUserA,
  assetsToSwapUserB,
  walletAddressUserA
);
// Sign the order (User A signs since they are initiating the trade)
const signedOrder = await nftSwapSdk.signOrder(order, takerAddress);
// Part 1 Complete. User A is now done. Now we send the `signedOrder` to User B to complete the trade.

// ............................
// Part 2 of the trade -- User B (the 'taker') accepts and fills order from User A and completes trade
// ............................
// Initiate the SDK for User B.
// Pass the user's wallet signer (available via the user's wallet provider) to the Swap SDK
const nftSwapSdk = new NftSwap(signerUserB, CHAIN_ID);

// Check if we need to approve the NFT for swapping
const approvalStatusForUserB = await nftSwapSdk.loadApprovalStatus(
  assetsToSwapUserB[0],
  walletAddressUserB
);
// If we do need to approve NFT for swapping, let's do that now
if (!approvalStatusForUserB.contractApproved) {
  const approvalTx = await nftSwapSdk.approveTokenOrNftByAsset(
    assetsToSwapUserB[0],
    walletAddressUserB
  );
  const approvalTxReceipt = await approvalTx.wait();
  console.log(
    `Approved ${assetsToSwapUserB[0].tokenAddress} contract to swap with 0x. TxHash: ${approvalTxReceipt.transactionHash})`
  );
}
// The final step is the taker (User B) submitting the order.
// The taker approves the trade transaction and it will be submitted on the blockchain for settlement.
// Once the transaction is confirmed, the trade will be settled and cannot be reversed.
const fillTx = await nftSwapSdk.fillSignedOrder(signedOrder);
const fillTxReceipt = await await nftSwapSdk.awaitTransactionHash(fillTx);
console.log(`🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`);
```
