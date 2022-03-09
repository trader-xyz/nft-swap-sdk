import { ethers } from 'ethers';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';
import { SwappableAssetV4 } from '../../src/sdk';

jest.setTimeout(90 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

const DAI_TOKEN_ADDRESS_TESTNET = '0x31f42841c2db5173425b5223809cf3a38fede360';
const TEST_NFT_CONTRACT_ADDRESS = '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b'; // https://ropsten.etherscan.io/token/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b

const RPC_TESTNET =
  'https://eth-ropsten.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);
// const TAKER_WALLET = new ethers.Wallet(TAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);
// const TAKER_PROVIDER = TAKER_WALLET.connect(PROVIDER);

const ROPSTEN_CHAIN_ID = 3;

const nftSwapperMaker = new NftSwapV4(
  MAKER_SIGNER as any,
  MAKER_SIGNER,
  ROPSTEN_CHAIN_ID
);
// const nftSwapperTaker = new NftSwap(TAKER_PROVIDER as any, 4);

const TAKER_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: DAI_TOKEN_ADDRESS_TESTNET,
  amount: '100000000000', // 1 USDC
};
const NFT_ASSET: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

describe('NFTSwapV4', () => {
  it('order matching should work', async () => {
    // NOTE(johnrjj) - Assumes USDC and DAI are already approved w/ the ExchangeProxy

    const v4Erc721OrderSellNft = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      TAKER_ASSET,
      MAKER_WALLET_ADDRESS
    );

    const v4Erc721OrderBuyNft = nftSwapperMaker.buildOrder(
      TAKER_ASSET,
      NFT_ASSET,
      MAKER_WALLET_ADDRESS
    );

    const signedOrderSellNft = await nftSwapperMaker.signOrder(
      v4Erc721OrderSellNft
    );
    const signedOrderBuyNft = await nftSwapperMaker.signOrder(
      v4Erc721OrderBuyNft
    );

    // const contractTx = await nftSwapperMaker.matchOrders(signedOrderSellNft, signedOrderBuyNft);
    // const txReceipt = await contractTx.wait()

    // console.log(`Matched NFT ERC721 Orders. Tx Hash: ${txReceipt.transactionHash}`)
  });
});
