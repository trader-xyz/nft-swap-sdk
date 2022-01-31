// @ts-nocheck
import { NftSwapV4 } from '@traderxyz/nft-swap-sdk';

// In this example, we'll swap CryptoPunk #69 for 420 WETH
const CRYPTOPUNK = {
  tokenAddress: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  tokenId: '69',
  type: 'ERC721', // Must be one of 'ERC20', 'ERC721', or 'ERC1155'
};

const FOUR_THOUSAND_TWENTY_WETH = {
  tokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', // WETH contract address
  amount: '420000000000000000000', // 420 Wrapped-ETH (WETH is 18 digits)
  type: 'ERC20',
};

// [Part 1: Maker (owner of the Punk) creates trade]
const nftSwapSdk = new NftSwapV4(provider, signerForMaker, CHAIN_ID);
const walletAddressMaker = '0x1234...';
await nftSwapSdk.approveTokenOrNftByAsset(CRYPTOPUNK, walletAddressMaker);
const order = nftSwapSdk.buildOrder(
  CRYPTOPUNK, // Maker asset to swap
  FOUR_THOUSAND_TWENTY_WETH, // Taker asset to swap
  walletAddressMaker
);
const signedOrder = await nftSwapSdk.signOrder(order, takerAddress);

// [Part 2: Taker (wants to buy the punk) fills trade]
const nftSwapSdk = new NftSwap(provider, signerForTaker, CHAIN_ID);
const walletAddressTaker = '0x9876...';
await nftSwapSdk.approveTokenOrNftByAsset(
  FOUR_THOUSAND_TWENTY_WETH,
  walletAddressTaker
);
const fillTx = await nftSwapSdk.fillSignedOrder(signedOrder);
const fillTxReceipt = await nftSwapSdk.awaitTransactionHash(fillTx.hash);
console.log(`🎉 🥳 Order filled. TxHash: ${fillTxReceipt.transactionHash}`);
