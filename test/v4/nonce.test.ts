import { ethers } from 'ethers';
import { ETH_ADDRESS_AS_ERC20 } from '../../src/sdk';
import { NftSwapV4 } from '../../src/sdk/v4/NftSwapV4';
import {
  generateRandomV4OrderNonce,
  TWO_FIFTY_SIX_BIT_LENGTH,
} from '../../src/sdk/v4/pure';

import { SwappableAssetV4 } from '../../src/sdk/v4/types';

jest.setTimeout(90 * 1000);

const MAKER_WALLET_ADDRESS = '0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b';
const MAKER_PRIVATE_KEY =
  'fc5db508b0a52da8fbcac3ab698088715595f8de9cccf2467d51952eec564ec9';

const TEST_NFT_CONTRACT_ADDRESS = '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b'; // https://ropsten.etherscan.io/token/0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b?a=0xabc23F70Df4F45dD3Df4EC6DA6827CB05853eC9b

const RPC_TESTNET =
  'https://eth-ropsten.alchemyapi.io/v2/is1WqyAFM1nNFFx2aCozhTep7IxHVNGo';

const MAKER_WALLET = new ethers.Wallet(MAKER_PRIVATE_KEY);

const PROVIDER = new ethers.providers.StaticJsonRpcProvider(RPC_TESTNET);

const MAKER_SIGNER = MAKER_WALLET.connect(PROVIDER);

const ROPSTEN_CHAIN_ID = 3;

const ETH_ASSET: SwappableAssetV4 = {
  type: 'ERC20',
  tokenAddress: ETH_ADDRESS_AS_ERC20,
  amount: '420000000000000', // 1 USDC
};

const NFT_ASSET: SwappableAssetV4 = {
  type: 'ERC721',
  tokenAddress: TEST_NFT_CONTRACT_ADDRESS,
  tokenId: '11045',
};

const maxNonce = BigInt(2 ** 256 - 1) + BigInt(1);

const sdkReservedNoncePrefix = '1001';

describe('NFTSwapV4', () => {
  it('custom nonce testing', async () => {
    // const half = BigInt(2^128 - 1);
    const TWO_FIFTY_SIX_BIT_LENGTH = 78;

    const appId = '1337';
    const v4Nonce = generateRandomV4OrderNonce(appId);

    // 256 bit number
    const nonceBigInt = BigInt(v4Nonce);

    expect(v4Nonce.startsWith(sdkReservedNoncePrefix)).toBe(true);
    expect(v4Nonce.length).toEqual(TWO_FIFTY_SIX_BIT_LENGTH);
    expect(v4Nonce.substring(4).startsWith(appId)).toBe(true);
    expect(nonceBigInt <= maxNonce).toBe(true);
  });

  it('order with default nonce', async () => {
    const defaultAppId = '314159';
    const nftSwapperMaker = new NftSwapV4(
      MAKER_SIGNER as any,
      MAKER_SIGNER,
      ROPSTEN_CHAIN_ID
    );

    const order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ETH_ASSET,
      MAKER_WALLET_ADDRESS
    );

    // 256 bit number
    const v4Nonce = order.nonce;
    const nonceBigInt = BigInt(order.nonce);

    expect(v4Nonce.startsWith(sdkReservedNoncePrefix)).toBe(true);
    expect(v4Nonce.length).toEqual(TWO_FIFTY_SIX_BIT_LENGTH);
    expect(v4Nonce.substring(4).startsWith(defaultAppId)).toBe(true);
    const isWithinMaxBits = nonceBigInt <= maxNonce;
    expect(isWithinMaxBits).toBe(true);
  });

  it('order with custom nonce', async () => {
    const customAppId = '696969';
    const nftSwapperMaker = new NftSwapV4(
      MAKER_SIGNER as any,
      MAKER_SIGNER,
      ROPSTEN_CHAIN_ID,
      {
        appId: customAppId,
      }
    );

    const order = nftSwapperMaker.buildOrder(
      NFT_ASSET,
      ETH_ASSET,
      MAKER_WALLET_ADDRESS
    );

    const v4Nonce = order.nonce;
    const nonceBigInt = BigInt(order.nonce);

    expect(v4Nonce.startsWith(sdkReservedNoncePrefix)).toBe(true);
    expect(v4Nonce.length).toEqual(TWO_FIFTY_SIX_BIT_LENGTH);
    expect(v4Nonce.substring(4).startsWith(customAppId)).toBe(true);
    expect(nonceBigInt < maxNonce).toBe(true);
  });
});
