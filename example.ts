// @ts-nocheck
import { NftSwap } from '@traderxyz/nft-swap-sdk';

// In this example, we'll swap CryptoPunk #420 for BoredApe #69
const CRYPTOPUNK_420 = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '420',
  type: 'ERC721', // Must be one of 'ERC20', 'ERC721', or 'ERC1155'
};
const BORED_APE_69 = {
  tokenAddress: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
  tokenId: '69',
  type: 'ERC721',
};

// [Part 1: Maker (owner of the Punk) creates trade]
const nftSwapSdk = new NftSwap(provider, signerForMaker, CHAIN_ID);
const walletAddressMaker = '0x1234...';
await nftSwapSdk.approveTokenOrNftByAsset(CRYPTOPUNK_420, walletAddressMaker);
const order = nftSwapSdk.buildOrder(
  [CRYPTOPUNK_420], // Maker asset(s) to swap
  [BORED_APE_69], // Taker asset(s) to swap
  walletAddressMaker
);
const signedOrder = await nftSwapSdk.signOrder(order, takerAddress);

// [Part 2: Taker (owner of the BoredApe) fills trade]
const nftSwapSdk = new NftSwap(provider, signerForTaker, CHAIN_ID);
const walletAddressTaker = '0x9876...';
await nftSwapSdk.approveTokenOrNftByAsset(BORED_APE_69, walletAddressTaker);
const fillTx = await nftSwapSdk.fillSignedOrder(signedOrder);
const fillTxReceipt = await nftSwapSdk.awaitTransactionHash(fillTx.hash);
console.log(`🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`);
