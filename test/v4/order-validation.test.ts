import { ethers } from 'ethers';
import { ETH_ADDRESS_AS_ERC20 } from '../../src/sdk';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';
import { SwappableAssetV4 } from '../../src/sdk/v4/types';

jest.setTimeout(20 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';
// NOTE(johnrjj) - NEVER use these private keys for anything of value, testnets only!

const DAI_TOKEN_ADDRESS_TESTNET = '0x31f42841c2db5173425b5223809cf3a38fede360';
const TEST_NFT_CONTRACT_ADDRESS = '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b'; // https://ropsten.etherscan.io/token/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b

const RPC_TESTNET =
  'https://eth-ropsten.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);

const ROPSTEN_CHAIN_ID = 3;

const nftSwapperMaker = new NftSwapV4(
  MAKER_SIGNER as any,
  MAKER_SIGNER,
  ROPSTEN_CHAIN_ID
);

const ETH_AS_BID_ASSET_NOT_ALLOWED: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: ETH_ADDRESS_AS_ERC20,
  amount: '100000000000', // 1 USDC
};
const NFT: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

describe('NFTSwapV4', () => {
  it('V4 NFT bids should throw if bidding with ETH directly.', async () => {
    // This is not allowed and should throw
    const buildNftBidWithNativeToken = () =>
      nftSwapperMaker.buildOrder(
        ETH_AS_BID_ASSET_NOT_ALLOWED,
        NFT,
        MAKER_WALLET_ADDRESS
      );

    // Use WETH instead!
    expect(buildNftBidWithNativeToken).toThrowError(
      'NFT Bids cannot use the native token (e.g. ETH). Please use the wrapped native token (e.g. WETH)'
    );
  });
});
